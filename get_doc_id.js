import fetch from 'node-fetch';

async function getDoc() {
    try {
        const res = await fetch('http://localhost:5000/api/documents');
        const docs = await res.json();
        if (docs.length > 0) {
            console.log('Doc ID:', docs[0].id);
            console.log('Current Folder:', docs[0].folderId);
        } else {
            console.log('No documents found.');
        }
    } catch (e) {
        console.error(e);
    }
}

getDoc();
