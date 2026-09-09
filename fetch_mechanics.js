fetch('http://localhost:3000/api/rules').then(r => r.json()).then(data => {
  console.log(JSON.stringify(data.find(r => r.key === 'system_mechanics'), null, 2));
}).catch(console.error);
