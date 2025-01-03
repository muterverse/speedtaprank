const WebSocket = require('ws'); // WebSocket 라이브러리 로드
const http = require('http');

// HTTP 서버 생성
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket Server Running');
});

// WebSocket 서버 생성
const wss = new WebSocket.Server({ server });

let clients = []; // 연결된 클라이언트 목록
let rankingStarted = false; // 랭킹 시작 여부
let rankingData = []; // 순위 데이터

// WebSocket 이벤트 핸들러
wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.push(ws);

    // 메시지 수신 이벤트 처리
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.nickname && data.userId) {
                // 사용자의 클릭을 처리하여 순위 업데이트
                handleUserClick(data.userId, data.nickname);
                broadcastRankingUpdate();
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    // 연결 종료 처리
    ws.on('close', () => {
        console.log('Client disconnected');
        clients = clients.filter((client) => client !== ws);
    });
});

// 순위 업데이트 브로드캐스트 함수
function broadcastRankingUpdate() {
    const message = JSON.stringify({
        type: 'ranking-update',
        data: rankingData,
    });

    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 사용자 클릭 처리 함수
function handleUserClick(userId, nickname) {
    const existingEntry = rankingData.find((entry) => entry.userId === userId);

    if (existingEntry) {
        existingEntry.clicks += 1;
    } else {
        rankingData.push({ userId, nickname, clicks: 1 });
    }

    // 클릭 수에 따라 내림차순 정렬
    rankingData.sort((a, b) => b.clicks - a.clicks);
}

// 랭킹 초기화 함수
function resetRanking() {
    rankingData = [];
    broadcastRankingUpdate();
}

// 서버 시작
server.listen(8080, () => {
    console.log('WebSocket server is running on ws://localhost:8080');
});

// 관리 명령을 처리하는 간단한 HTTP API (선택 사항)
const express = require('express');
const app = express();

app.use(express.json());

app.post('/start-ranking', (req, res) => {
    rankingStarted = true;
    res.send({ success: true, message: 'Ranking has started!' });
});

app.post('/reset-ranking', (req, res) => {
    resetRanking();
    res.send({ success: true, message: 'Ranking has been reset!' });
});

// 관리 서버 시작
app.listen(8081, () => {
    console.log('Admin API server is running on http://localhost:8081');
});
