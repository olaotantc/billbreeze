const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "dist", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const pwaTags = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="BillBreeze" />
    <link rel="apple-touch-icon" href="/icon-1024.png" />`;

// Inject before </head>
html = html.replace("</head>", pwaTags + "\n  </head>");

fs.writeFileSync(indexPath, html);
console.log("PWA tags injected into dist/index.html");
