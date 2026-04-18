import * as MB from "mediabunny";

try {
  const outputOptions = {
    target: new MB.BufferTarget(),
    format: new MB.Mp4OutputFormat(),
    video: {
      codec: 'avc1.4d0034',
      bitrate: 1000000 
    },
    audio: {
      codec: 'mp4a.40.2',
      bitrate: 128_000, 
    }
  };
  const output = new MB.Output(outputOptions);
  console.log("Output created successfully!");
} catch(e) {
  console.error("Output Error:", e.stack);
}
