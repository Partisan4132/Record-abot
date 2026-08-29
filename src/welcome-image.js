import sharp from "sharp";

async function download(url ) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not download image: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, character => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;"
  })[character]);
}

export async function createWelcomeImage({
  backgroundUrl,
  avatarUrl,
  username
}) {
  const width = 1200;
  const height = 630;
  const background = await download(backgroundUrl);
  const avatar = await download(avatarUrl);
  const avatarPng = await sharp(avatar)
    .resize(190, 190)
    .png()
    .toBuffer();

  const overlay = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="circle">
          <circle cx="600" cy="245" r="95" />
        </clipPath>
        <filter id="shadow">
          <feDropShadow dx="0" dy="5" stdDeviation="8" flood-opacity=".45" />
        </filter>
      </defs>
      <rect width="1200" height="630" fill="rgba(0,0,0,.22 )" />
      <circle cx="600" cy="245" r="105" fill="#ffffff" opacity=".95" filter="url(#shadow)" />
      <image
        href="data:image/png;base64,${avatarPng.toString("base64")}"
        x="505"
        y="150"
        width="190"
        height="190"
        clip-path="url(#circle)"
        preserveAspectRatio="xMidYMid slice"
      />
      <text
        x="600"
        y="410"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="54"
        font-weight="700"
        fill="white"
        stroke="#111827"
        stroke-width="2"
        paint-order="stroke"
      >Welcome, ${escapeXml(username)}!</text>
    </svg>
  `);

  return sharp(background)
    .resize(width, height, { fit: "cover" })
    .composite([{ input: overlay }])
    .png()
    .toBuffer();
}
