const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const base64 = `data:${mime};base64,DATA`;
const regex = /^data:([A-Za-z-+\/]+);base64,(.+)$/;
const match = base64.match(regex);
console.log(`Mime: ${mime}`);
console.log(`Match: ${match ? 'YES' : 'NO'}`);

const fixedRegex = /^data:([A-Za-z0-9-+\/.]+);base64,(.+)$/;
const fixedMatch = base64.match(fixedRegex);
console.log(`Fixed Match: ${fixedMatch ? 'YES' : 'NO'}`);
