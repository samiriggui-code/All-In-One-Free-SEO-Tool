// Fixture site for the parity test. Kept in plain JS so the reference run
// (the published @seomator/seo-audit package, outside this repo) can load
// the very same pages.
const lorem = (n) => Array.from({ length: n }, (_, i) => `Widgets number ${i} are tested under heavy load by our engineering team every week.`).join(" ");
export const PAGES = {
  "/": `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Acme widgets: durable widgets for every workshop</title>
<meta name="description" content="Acme makes durable widgets for workshops, garages and factories. Browse the catalogue and order online with free delivery.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="/"><link rel="icon" href="/favicon.ico">
<link rel="alternate" hreflang="fr" href="/fr"><link rel="alternate" hreflang="en" href="/">
<meta property="og:title" content="Acme widgets"><meta property="og:description" content="Durable widgets"><meta property="og:image" content="/og.png"><meta property="og:url" content="/"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"/#org","name":"Acme","logo":"/logo.png","telephone":"+33 1 23 45 67 89","address":{"streetAddress":"1 rue de Paris","addressLocality":"Paris","postalCode":"75001","addressCountry":"FR"}},{"@type":"WebSite","name":"Acme","url":"/","publisher":{"@id":"/#org"}}]}</script>
<script src="/app.js" defer></script><link rel="stylesheet" href="/style.css">
</head><body><header><nav><a href="/about">About</a> <a href="/contact">Contact</a> <a href="/blog/post">Blog</a> <a href="javascript:void(0)">JS</a> <a href="http://localhost/x">local</a></nav></header>
<main><h1>Durable widgets</h1><h2>Why</h2><p>${lorem(30)}</p>
<img src="/w.png" alt="A steel widget" width="400" height="300"><img src="/big-hero.jpg"><img src="/x.bmp" alt="">
<form><input type="email" name="email"><button></button></form>
<iframe src="http://insecure.example/embed"></iframe>
<a href="//cdn.example/file.js">cdn</a> <a href="/missing">missing</a>
<table><tr><th>A</th></tr><tr><td>1</td></tr></table>
</main><footer>© Acme <a href="/privacy">Privacy</a></footer></body></html>`,
  "/about": `<!doctype html><html lang="en"><head><title>About Acme</title><meta name="viewport" content="width=device-width, user-scalable=no"></head>
<body><h1>About</h1><h3>Team</h3><p>Short.</p><a href="/">Home</a><a href="/">click here</a></body></html>`,
  "/contact": `<!doctype html><html><head><meta name="robots" content="noindex"><title>Contact</title><link rel="canonical" href="/about"></head>
<body><h1>Contact</h1><h1>Again</h1><a href="/">Home</a><p>Email us at hello@acme.test or call +33 1 23 45 67 89.</p></body></html>`,
  "/blog/post": `<!doctype html><html lang="en"><head><title>How we test widgets - Acme blog</title><meta name="description" content="short">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"How we test widgets","author":{"@type":"Person","name":"Jane Doe"},"datePublished":"2024-01-01"}</script>
</head><body><article><h1>How we test widgets</h1><p>By Jane Doe, published 2024-01-01</p><p>${lorem(60)}</p><a href="https://en.wikipedia.org/wiki/Widget">source</a></article><a href="/">Home</a></body></html>`,
  "/fr": `<!doctype html><html lang="fr"><head><title>Acme widgets en français</title><link rel="alternate" hreflang="en" href="/"></head><body><h1>Widgets</h1><a href="/">Accueil</a></body></html>`,
  "/privacy": `<!doctype html><html lang="en"><head><title>Privacy policy</title></head><body><h1>Privacy</h1><p>${lorem(10)}</p><a href="/">Home</a></body></html>`,
};
export function handler(origin) {
  return (req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    if (path === "/robots.txt") { res.writeHead(200, { "content-type": "text/plain" }); res.end(`User-agent: *\nDisallow: /private\nUser-agent: GPTBot\nDisallow: /\nSitemap: ${origin()}/sitemap.xml\n`); return; }
    if (path === "/sitemap.xml") { res.writeHead(200, { "content-type": "application/xml" }); res.end(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + Object.keys(PAGES).map((p) => `<url><loc>${origin()}${p}</loc><lastmod>2024-05-01</lastmod></url>`).join("") + `<url><loc>${origin()}/gone</loc></url></urlset>`); return; }
    if (path === "/llms.txt") { res.writeHead(200, { "content-type": "text/plain" }); res.end("# Acme\n> Widgets\n"); return; }
    if (path === "/app.js") { res.writeHead(200, { "content-type": "application/javascript" }); res.end("var a = 1;\n\n\n   function  x ( ) {  return a ; }\n".repeat(200)); return; }
    if (path === "/style.css") { res.writeHead(200, { "content-type": "text/css" }); res.end("body { color : red ; }\n\n".repeat(200)); return; }
    const body = PAGES[path];
    if (!body) { res.writeHead(404, { "content-type": "text/html" }); res.end("<html><head><title>Not found</title></head><body><h1>404</h1><a href='/'>home</a></body></html>"); return; }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "x-frame-options": "DENY", "set-cookie": "sid=1; Path=/" });
    res.end(body);
  };
}
