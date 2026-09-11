sed -i "s/<SelectValue \/>/<SelectValue>{selectedGroup === 'all' ? 'Grupo: Todos' : \`Grupo: \${selectedGroup}\`}<\/SelectValue>/g" src/views/CharactersAdmin.tsx
