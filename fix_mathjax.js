const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src/pages/GeneratorPage.tsx');
let content = fs.readFileSync(p, 'utf8');

// Insert useEffect for MathJax
const mathJaxHook = `
  useEffect(() => {
    if (!isGenerating && generatedHtml && (window as any).MathJax) {
      setTimeout(() => {
        try {
          (window as any).MathJax.typesetPromise();
        } catch (e) {
          console.error("MathJax error", e);
        }
      }, 100);
    }
  }, [generatedHtml, isGenerating]);
`;

if (!content.includes('MathJax.typesetPromise')) {
    content = content.replace('const [generatingDhikr, setGeneratingDhikr] = useState(\'\');', 'const [generatingDhikr, setGeneratingDhikr] = useState(\'\');\n' + mathJaxHook);
    fs.writeFileSync(p, content);
}
