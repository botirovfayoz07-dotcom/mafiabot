# Mafia bot

1. `npm install`
2. `.env.example` ni `.env` deb nusxalang va to'ldiring
3. `npm start`

Botni guruhga qo'shib, admin qiling (xabarlarni o'chirish huquqi bilan).
Guruhda `/game` — yangi o'yin. Shaxsiy chatda adminlar uchun `/admin`.

## GIFlar
`gifs/` papkasida `night.gif`, `day.gif`, `vote.gif` bor — bot ularni o'zi yuboradi.
O'zingizniki bilan almashtirish mumkin (fayl nomini saqlang) yoki `.env` ga `GIF_NIGHT` / `GIF_DAY` / `GIF_VOTE` (file_id) yozing.
`gifs/make_gifs.py` — GIFlarni qayta yasash skripti (Python + Pillow).
