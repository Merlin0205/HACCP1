const fs = require('fs');
const path = require('path');

const content = `{
  "indexes": [
    {
      "collectionGroup": "customIcons",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "createdBy",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}`;

const filePath = path.join(__dirname, 'firestore.indexes.json');

try {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Hard delete
    }
    fs.writeFileSync(filePath, content, { encoding: 'utf8' }); // Explicit UTF-8
    console.log('Successfully wrote firestore.indexes.json in clean UTF-8');
} catch (err) {
    console.error('Error fixing file:', err);
    process.exit(1);
}
