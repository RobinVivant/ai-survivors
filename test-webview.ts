import { Webview } from "webview-bun";

console.log("Testing basic webview functionality...");

const webview = new Webview();
webview.width = 800;
webview.height = 600;
webview.title = "Test Webview";

// Test with a simple HTML string first
const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
    <style>
        body { 
            background: #2d2d2d; 
            color: white; 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 100px; 
        }
        h1 { color: #4CAF50; }
    </style>
</head>
<body>
    <h1>Webview Test</h1>
    <p>If you can see this, the webview is working!</p>
    <button onclick="alert('Button clicked!')">Test Button</button>
</body>
</html>
`;

webview.setHTML(html);
webview.run();