// File: /api/generate-script.js

export default async function handler(request, response) {
    // 1. Hanya izinkan metode POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Ambil Kunci API Rahasia Anda dari Vercel Environment Variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return response.status(500).json({ error: "Kunci API Gemini belum diatur di server." });
    }

    // URL API Google Gemini (berdasarkan file Anda)
    const GEMINI_API_URL = `https://generativelenlanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`;

    try {
        // 3. Ambil data (inputs) yang dikirim dari HTML
        // Vercel menggunakan request.body secara langsung
        const { inputs } = request.body;

        if (!inputs) {
            return response.status(400).json({ error: "Request body 'inputs' diperlukan." });
        }
        
        // (Logika ini dari file lama Anda, saya sesuaikan)
        // Anda mungkin perlu menyesuaikan prompt ini jika Anda ingin mengubah cara AI merespons
        const systemPrompt = `Anda adalah seorang ahli strategi outreach B2B dan copywriter profesional... (dst)`;
        const userPrompt = `
Platform: ${inputs.platform}
Bahasa yang Diminta: ${inputs.bahasa}
... (dan semua input lainnya) ...
Tugas: Tuliskan skrip outreach sekarang.
`;
        
        // 4. Siapkan payload untuk dikirim ke Google Gemini
        // Ini disesuaikan dengan file `generate-script.js` Anda yang baru
        const payload = {
            contents: [{
                parts: [{ text: userPrompt }]
            }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            }
        };

        // 5. Panggil API Gemini dari server Vercel
        const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error("Error dari Gemini:", errorData);
            return response.status(geminiResponse.status).json({ error: `Gagal memanggil API Gemini.` });
        }

        const result = await geminiResponse.json();

        // 6. Ekstrak teks dan kirim kembali ke HTML (Frontend)
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
            // KIRIM RESPON SUKSES (Format baru Vercel)
            return response.status(200).json({ script: text });
        } else {
            return response.status(500).json({ error: "Respons dari Gemini tidak valid atau diblokir." });
        }

    } catch (error) {
        console.error("Error internal server Vercel:", error);
        return response.status(500).json({ error: `Terjadi error pada server: ${error.message}` });
    }
}
