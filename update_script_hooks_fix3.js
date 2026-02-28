const fs = require('fs');

const path = './src/app/components/ThermomixCooker.tsx';
let content = fs.readFileSync(path, 'utf8');

const regexToReplace = /<div className="flex items-center gap-4 mt-2 mb-4">[\s\S]*?<\/div>\s*<\/div>\s*\);\s*}\s*return \(\s*<div key={question.id}/;

// Re-read file manually
