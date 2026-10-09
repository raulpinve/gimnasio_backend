// Carga los programas de programs.json llamando a POST /admin/program-templates
// Requiere Node 18+ (fetch incluido).
//
// Uso:
//   API_URL=http://localhost:3000/api TOKEN=<token-firebase-admin> node seed_programs.mjs
//
// Si usas MOCK_AUTH=true en el backend, puedes omitir TOKEN.

import { readFile } from 'node:fs/promises';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';
const TOKEN = process.env.TOKEN;

const programs = JSON.parse(
    await readFile(new URL('./programs.json', import.meta.url), 'utf-8')
);

for (const program of programs) {
    const res = await fetch(`${API_URL}/admin/program-templates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
        },
        body: JSON.stringify(program)
    });

    const body = await res.json().catch(() => ({}));

    if (res.ok) {
        console.log(`✔ ${program.name}`);
    } else {
        console.log(`✘ ${program.name} (${res.status})`);
        console.log(JSON.stringify(body.error ?? body, null, 2));
    }
}
