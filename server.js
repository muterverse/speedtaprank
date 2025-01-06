const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http'); // HTTP 모듈로 변경

const app = express();

// HTTP 서버 생성
const server = http.createServer(app);

// WebSocket 서버 설정
const wss = new WebSocket.Server({ server });



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

// HTTP 서버 실행
const PORT = 4000; // 다른 포트 사용
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
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
// 랭킹 시작
app.post('/start-ranking', (req, res) => {
    try {
        rankingStarted = true;
        console.log('Ranking started'); // 확인 로그 추가
        broadcastRanking();
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

    // 사용자에게 연결 메시지 전송
    ws.send(
        JSON.stringify({
            type: 'connection',
            userId,
            message: `Welcome, ${users[userId].nickname}!`,
        })
    );

    // WebSocket 메시지 처리
ws.on('message', (message) => {
    console.log('Received message from client:', message); // 로그 추가
    try {
        const data = JSON.parse(message);

        if (!data.userId || !users[data.userId]) {
            return ws.send(
                JSON.stringify({ type: 'error', message: 'Invalid userId or user not found' })
            );
        }

        if (!rankingStarted) {
            return ws.send(
                JSON.stringify({ type: 'error', message: 'Ranking has not started yet!' })
            );
        }

        // 클릭 수 증가 및 순위 업데이트
        users[data.userId].clicks += 1; // 클릭 수 증가
        console.log(`Updated clicks for ${data.userId}: ${users[data.userId].clicks}`); // 클릭 수 확인

        updateRanking(); // 순위 업데이트
        broadcastRankingToAll(); // 사용자에게 순위 표시
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
    console.log('Updating ranking...'); // 확인 로그
    ranking = Object.values(users)
        .filter((user) => user.clicks > 0) // 클릭 수가 0 이상인 사용자만 포함
        .sort((a, b) => b.clicks - a.clicks) // 클릭 수 기준 내림차순 정렬
        .slice(0, 10); // 상위 10명만 유지
    console.log('Updated ranking:', ranking); // 갱신된 랭킹 로그 출력
}

// 순위 브로드캐스트 함수 (관리자에게만 전송)
function broadcastRanking() {
    const rankingData = ranking.map((user, index) => ({
        rank: index + 1,
        nickname: user.nickname,
        clicks: user.clicks,
    }));

    const message = JSON.stringify({ type: 'ranking-update', data: rankingData });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.isAdmin) {
            client.send(message);
        }
    });
}

// 모든 사용자에게 순위 브로드캐스트
function broadcastRankingToAll() {
    const rankingData = ranking.map((user, index) => ({
        rank: index + 1,
        nickname: user.nickname,
        clicks: user.clicks,
    }));

    console.log('Broadcasting ranking data:', rankingData); // 로그 추가

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

// 404 처리
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not Found' });
});

// 서버 시작
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
