This open-source repo provided by AssemblyAI displays how to use our real-time API in the browser!

In this app, we grab an audio stream from the user's computer and then send that over a WebSocket to AssemblyAI for real-time transcription. Once AssemblyAI begins transcribing, we display the text in the browser. This is accomplished using Express for our backend and Vanilla JavaScript with the npm package [recordrtc](https://www.npmjs.com/package/recordrtc) for our frontend.

## How To Install and Run the Project

##### ❗Important❗

- Before running this app, you need to upgrade your AssemblyAI account. The real-time API is only available to upgraded accounts at this time.
- Running the app before upgrading will cause an **error with a 402 status code.** ⚠️

##### Instructions

1. Clone the repo to your local machine.
2. Open a terminal in the main directory housing the project. In this case `realtime-transcription`.
3. Run `npm install` or `yarn` to ensure all dependencies are installed.
4. Add your AssemblyAI key to line 13 of [`server.js`] and Deepgram key to line 127 of [`index.js`]
5. Start the server with the command `npm run server` (will run on port 8000).
6. Open a second terminal in the main directory of the project and start the client side with `npm run client` (will run on port 3000).
