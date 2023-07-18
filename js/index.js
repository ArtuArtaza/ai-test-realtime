// required dom elements
const buttonEl = document.getElementById('button');
const messageEl = document.getElementById('message');
const titleEl = document.getElementById('real-time-title');
const transcriptionEl = document.getElementById("transcription-select")
// set initial state of application variables
messageEl.style.display = 'none';
let isRecording = false;
let socket;
let recorder;
let transcriptionType;

// runs real-time transcription and handles global variables
const run = async () => {
  if (transcriptionEl.value === "assembly") {
    await runAssemblyAI()
  } else {
    await runDeepgram()
  }
  isRecording = !isRecording;
  buttonEl.innerText = isRecording ? 'Stop' : 'Record';
  titleEl.innerText = isRecording ? 'Click stop to end recording!' : 'Click start to begin recording!'
};

buttonEl.addEventListener('click', () => run());

const runAssemblyAI = async () => {
  if (isRecording) {
    if (socket) {
      socket.send(JSON.stringify({ terminate_session: true }));
      socket.close();
      socket = null;
    }

    if (recorder) {
      recorder.pauseRecording();
      recorder = null;
    }
  } else {
    const response = await fetch('http://localhost:8000'); // get temp session token from server.js (backend)
    const data = await response.json();

    if (data.error) {
      alert(data.error)
    }

    const { token } = data;

    // establish wss with AssemblyAI (AAI) at 16000 sample rate
    socket = await new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`);

    // handle incoming messages to display transcription to the DOM
    const texts = {};
    socket.onmessage = (message) => {
      let msg = '';
      const res = JSON.parse(message.data);
      texts[res.audio_start] = res.text;
      const keys = Object.keys(texts);
      keys.sort((a, b) => a - b);
      for (const key of keys) {
        if (texts[key]) {
          msg += ` ${texts[key]}`;
        }
      }
      messageEl.innerText = msg;
      console.log(msg)
    };

    socket.onerror = (event) => {
      console.error(event);
      socket.close();
    }

    socket.onclose = event => {
      console.log(event);
      socket = null;
    }

    socket.onopen = () => {
      // once socket is open, begin recording
      messageEl.style.display = '';
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          recorder = new RecordRTC(stream, {
            type: 'audio',
            mimeType: 'audio/webm;codecs=pcm', // endpoint requires 16bit PCM audio
            recorderType: StereoAudioRecorder,
            timeSlice: 250, // set 250 ms intervals of data that sends to AAI
            desiredSampRate: 16000,
            numberOfAudioChannels: 1, // real-time requires only one channel
            bufferSize: 4096,
            audioBitsPerSecond: 128000,
            ondataavailable: (blob) => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64data = reader.result;

                // audio data must be sent as a base64 encoded string
                if (socket) {
                  socket.send(JSON.stringify({ audio_data: base64data.split('base64,')[1] }));
                }
              };
              reader.readAsDataURL(blob);
            },
          });

          recorder.startRecording();
        })
        .catch((err) => console.error(err));
    };
  }
}

const runDeepgram = async () => {
  if (isRecording) {
    if (socket) {
      socket.send(JSON.stringify({ type: 'CloseStream' }));
      socket.close();
      socket = null;
    }

    if (recorder) {
      recorder.pauseRecording();
      recorder = null;
    }
  } else {
    const socket = new WebSocket('wss://api.deepgram.com/v1/listen', ['token', "YOUR TOKEN GOES HERE"])
    messageEl.style.display = '';
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mediaRecorder = new MediaRecorder(stream)
      socket.onopen = () => {
        mediaRecorder.addEventListener('dataavailable', event => {
          if (event.data.size > 0 && socket.readyState == 1) {
            socket.send(event.data)
          }
        })
        mediaRecorder.start(250)
      }

      socket.onmessage = (message) => {
        console.log({ event: 'onmessage', message })
        const received = JSON.parse(message.data)
        const transcript = received.channel.alternatives[0].transcript
        messageEl.innerText += transcript + ''
        if (transcript && received.is_final) {
          console.log(transcript)
          messageEl.innerText += transcript + ''
        }
      }

      socket.onclose = (event) => {
        console.log({ event: 'onclose' })
        console.log(event);
        socket = null;
      }

      socket.onerror = (error) => {
        console.log({ event: 'onerror', error })
      }
    }).catch(err => console.log(err))
  }
}
