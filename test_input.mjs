import * as MB from "mediabunny";
console.log(MB.ALL_FORMATS);

try {
  const source = new MB.BlobSource(new Blob(["mock video data"], { type: "video/mp4" }));
  const input = new MB.Input({ source, formats: MB.ALL_FORMATS });
  console.log("Input created successfully!");
} catch(e) {
  console.error(e.message);
}
