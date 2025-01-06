const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http'); // HTTP 모듈

const app = express();

// HTTP 서버 생성
const server = http.createServer(app);

// WebSocket 서버 설정
const wss = new WebSocket.Server({ server });

const PORT = 3000; // HTTP 기본 포트

// 사용자 데이터 저장
let ranking = [];
let rankingStarted = false;

const users = {}; // 사용자 데이터 저장

// JSON 파싱 미들웨어
app.use(express.json());

// 정적 파일 제공
app.use(express.static(path.join(__dirname)));

// 라우팅: 메인 페이지 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket 연결 이벤트
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);
        // 메시지 처리 로직 추가
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

// 닉네임 설정 API
app.post('/set-nickname', (req, res) => {
    const { nickname } = req.body;

    if (!nickname || typeof nickname !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid nickname' });
    }

    const userId = `user-${Date.now()}`;
    users[userId] = { nickname, clicks: 0, ws: null };

    res.json({ success: true, userId, nickname });
});

// 현재 순위 가져오기 API
app.post('/current-ranking', (req, res) => {
    const { nickname } = req.body;

    if (!nickname) {
        return res.status(400).json({ success: false, error: 'Nickname is required' });
    }

    const user = Object.values(users).find((u) => u.nickname === nickname);

    if (user) {
        const rank = ranking.findIndex((u) => u.nickname === nickname) + 1;
        return res.json({ success: true, rank });
    }

    res.status(404).json({ success: false, error: 'User not found in ranking' });
});

// 관리자 로그인 API
app.post('/admin-login', (req, res) => {
    const { password } = req.body;

    if (password === '2025!') {
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(403).json({ success: false, message: 'Invalid password' });
    }
});

// 랭킹 시작 API
app.post('/start-ranking', (req, res) => {
    try {
        rankingStarted = true;
        console.log('Ranking started');
        res.json({ success: true, message: 'Ranking started!' });
    } catch (error) {
        console.error('Error in /start-ranking:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// 랭킹 초기화 API
app.post('/reset-ranking', (req, res) => {
    rankingStarted = false;
    ranking = [];
    Object.values(users).forEach((user) => (user.clicks = 0));
    broadcastReset();
    res.json({ success: true, message: 'Ranking reset!' });
});

// WebSocket 연결 처리
wss.on('connection', (ws) => {
    const userId = `user-${Date.now()}`;
    users[userId] = {
        nickname: `Guest_${userId}`,
        clicks: 0,
        ws,
    };

    console.log(`New user connected: ${userId}`);

    ws.send(
        JSON.stringify({
            type: 'connection',
            userId,
            message: `Welcome, ${users[userId].nickname}!`,
        })
    );

    ws.on('message', (message) => {
        console.log('Received message from client:', message);
        try {
            const data = JSON.parse(message);

            if (!data.userId || !users[data.userId]) {
                return ws.send(
                    JSON.stringify({ type: 'error', message: '재접속 했어요' })
                );
            }

            if (!rankingStarted) {
                return ws.send(
                    JSON.stringify({ type: 'error', message: '아직 시작하지 않았어요!' })
                );
            }

            users[data.userId].clicks += 1;
            updateRanking();
            broadcastRankingToAll();
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Error processing message' }));
        }
    });

    ws.on('close', () => {
        console.log(`User disconnected: ${userId}`);
        delete users[userId];
    });
});

function updateRanking() {
    ranking = Object.values(users)
        .filter((user) => user.clicks > 0)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 100);
}

// 모든 사용자에게 순위 브로드캐스트
function broadcastRankingToAll() {
    const rankingData = ranking.map((user, index) => ({
        rank: index + 1,
        nickname: user.nickname,
        clicks: user.clicks,
    }));

    const message = JSON.stringify({ type: 'ranking-update', data: rankingData });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 초기화 브로드캐스트 함수
function broadcastReset() {
    const message = JSON.stringify({ type: 'ranking-reset' });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 중복 실행 방지 및 에러 처리
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});

// 서버 시작
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
