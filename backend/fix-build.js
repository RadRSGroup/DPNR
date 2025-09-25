#!/usr/bin/env node

/**
 * Post-build script to fix compilation issues for production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing build issues...');

// Fix module-alias registration in main entry file
const indexPath = path.join(__dirname, 'dist', 'index.js');
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');

  // Add module-alias registration if not already present
  if (!content.includes("require('module-alias/register')")) {
    content = content.replace(
      '"use strict";',
      '"use strict";\nrequire(\'module-alias/register\');'
    );
    fs.writeFileSync(indexPath, content);
    console.log('✅ Added module-alias registration to index.js');
  }
}

// Fix middleware file - comment out missing type imports
const middlewarePath = path.join(__dirname, 'dist', 'utils', 'middleware.js');
if (fs.existsSync(middlewarePath)) {
  let content = fs.readFileSync(middlewarePath, 'utf8');

  // Comment out the types/express import
  content = content.replace(
    'require("../types/express");',
    '// require("../types/express"); // Commented out for production build'
  );

  fs.writeFileSync(middlewarePath, content);
  console.log('✅ Fixed middleware.js imports');
}

console.log('🎉 Build fixes completed successfully!');