// Native fetch is available in Node 18+

async function testRAG() {
    console.log("Testing RAG endpoint...");
    const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: "Apa isi dokumen Laporan Keuangan?",
            history: []
        })
    });

    const data = await response.json();
    console.log("\n--- AI Reply ---");
    console.log(data.reply);
    console.log("\n--- Top Result ---");
    if (data.results && data.results.length > 0) {
        console.log(data.results[0].title);
    } else {
        console.log("No results found.");
    }
}

testRAG().catch(console.error);
