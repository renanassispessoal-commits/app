# LoungeMatch — PRD

## Visão
Tinder por sala, criadas a partir de um QR Code do rolê.

## Papéis
- **Anfitrião (Admin):** autentica com email/senha (JWT). Cria salas, gera QR Code, vê estatísticas em tempo real e gerencia denúncias.
- **Usuário:** sem cadastro fixo. Entra na sala lendo o QR Code (ou digitando o código). Cria um perfil rápido (nome, idade, bio, interesses, foto) que vale só naquela sala.

## Fluxos
1. Anfitrião faz login → cria sala → QR Code + código de 6 chars é exibido.
2. Convidado lê o QR Code (ou digita) → cria perfil → entra no deck.
3. Swipe estilo Tinder (like/dislike) com os outros da sala. Like mútuo = MATCH.
4. Match abre chat simples (polling a cada 4s).
5. Em qualquer card o usuário pode tocar no triângulo de denúncia (abuso, xingamento, spam, outro).
6. Anfitrião vê denúncias na sala e marca como resolvidas.

## Endpoints principais (`/api`)
- Auth: `POST /auth/host/register`, `POST /auth/host/login`, `GET /auth/host/me`
- Rooms: `POST /rooms`, `GET /rooms/host`, `GET /rooms/by-code/{code}`, `GET /rooms/{id}`, `GET /rooms/{id}/stats`, `POST /rooms/{id}/close`
- Participants: `POST /participants/join`, `GET /rooms/{id}/deck`
- Swipes/Matches: `POST /swipes`, `GET /rooms/{id}/matches`
- Messages: `GET/POST /matches/{id}/messages`
- Reports: `POST /reports`, `GET /rooms/{id}/reports`, `PUT /reports/{id}/resolve`

## Stack
- Backend: FastAPI + Motor + JWT (PyJWT) + bcrypt (passlib).
- Frontend: Expo Router, expo-camera (QR), expo-image-picker (foto base64), react-native-qrcode-svg, axios.
- Tema: Glass / Luxe DARK (Midnight Black + Esmeralda + Rubi).
