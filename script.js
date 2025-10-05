document.addEventListener('DOMContentLoaded', () => {
    // 전역 변수
    let allData = [];
    let map, tileLayer, markerLayerGroup;
    let isDarkMode = false;

    // 본부(HQ) 위치
    const HQ_LAT = 37.5167791;
    const HQ_LNG = 127.0320472;
    const DEFAULT_ZOOM = 16;

    // 지도 타일 URL
    const TILE_URLS = {
        light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    };
    
    const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    // 화면 요소
    const screens = document.querySelectorAll('.screen');
    const startBtn = document.getElementById('start-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    // 네비게이션 버튼
    const goToBestiaryBtn = document.getElementById('go-to-bestiary-btn');
    const goToRandomizerBtn = document.getElementById('go-to-randomizer-btn');
    const backToMapFromBestiaryBtn = document.getElementById('back-to-map-from-bestiary-btn');
    const backToMapFromRandomizerBtn = document.getElementById('back-to-map-from-randomizer-btn');
    
    // 도감 모달
    const bestiaryModal = document.getElementById('bestiary-modal');
    const modalCloseBtn = bestiaryModal.querySelector('.close-btn');

    // 랜덤 뽑기
    const drawBtn = document.getElementById('draw-btn');
    const typeBtnContainer = document.getElementById('type-btn-group');
    const resultsContainer = document.getElementById('random-results');


    // 화면 전환 함수
    function showScreen(screenId) {
        screens.forEach(screen => screen.classList.remove('active'));
        const nextScreen = document.getElementById(screenId);
        if (nextScreen) {
            nextScreen.classList.add('active');
            if (screenId === 'map-screen' && map) {
                setTimeout(() => map.invalidateSize(), 300); 
            }
        }
    }

    // ==============================================
    // 1. 이벤트 리스너 설정
    // ==============================================
    
    // 시작 버튼
    const handleStart = () => showScreen('map-screen');
    startBtn.addEventListener('click', handleStart);
    startBtn.addEventListener('touchstart', handleStart);

    // 다크 모드 토글
    darkModeToggle.addEventListener('change', (e) => {
        isDarkMode = e.target.checked;
        document.body.classList.toggle('dark-mode', isDarkMode);
        updateContentForMode();
    });

    // 화면 이동 버튼
    goToBestiaryBtn.addEventListener('click', () => showScreen('bestiary-screen'));
    goToRandomizerBtn.addEventListener('click', () => showScreen('randomizer-screen'));
    backToMapFromBestiaryBtn.addEventListener('click', () => showScreen('map-screen'));
    backToMapFromRandomizerBtn.addEventListener('click', () => showScreen('map-screen'));

    // 모달 닫기
    modalCloseBtn.addEventListener('click', () => bestiaryModal.classList.remove('active'));
    bestiaryModal.addEventListener('click', (e) => {
        if (e.target === bestiaryModal) bestiaryModal.classList.remove('active');
    });

    // ==============================================
    // 2. 지도 초기화
    // ==============================================
    function initMap() {
        if (map) return;
        map = L.map('map').setView([HQ_LAT, HQ_LNG], DEFAULT_ZOOM);
        
        tileLayer = L.tileLayer(TILE_URLS.light, { attribution: TILE_ATTRIBUTION }).addTo(map);
        markerLayerGroup = L.layerGroup().addTo(map);

        const hqIcon = L.divIcon({
            className: 'hq-marker-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });

        L.marker([HQ_LAT, HQ_LNG], { icon: hqIcon }).addTo(map)
            .bindPopup('<b>HQ 🛡️ 학동 본부</b><br>출정 준비 완료!');
    }
    
    // ==============================================
    // 3. 데이터 로딩 및 초기 설정
    // ==============================================
    fetch('db.json')
        .then(response => response.json())
        .then(data => {
            allData = data;
            initMap(); 
            updateContentForMode(); // 초기 모드(라이트)에 맞게 콘텐츠 업데이트
        })
        .catch(error => console.error('데이터 로딩 오류:', error));

    // ==============================================
    // 4. 모드에 따른 콘텐츠 업데이트
    // ==============================================
    function updateContentForMode() {
        const categoryToDisplay = isDarkMode ? 2 : 1;
        const filteredData = allData.filter(item => item.category === categoryToDisplay);
        
        // 지도 타일 변경
        if(tileLayer) tileLayer.setUrl(isDarkMode ? TILE_URLS.dark : TILE_URLS.light);

        // UI 텍스트 변경
        updateUITexts(isDarkMode);
        
        // 지도 마커 표시
        displayMapMarkers(filteredData);

        // 도감 리스트 표시
        displayBestiaryList(filteredData);
        
        // 랜덤 뽑기 옵션 설정
        setupRandomizerOptions(filteredData);
    }

    function updateUITexts(isDark) {
        // 시작 화면
        document.getElementById('splash-title').textContent = isDark ? "밤의 유흥을 즐겨라!" : "밥 먹고 레벨업! 학동 맛집!";
        document.getElementById('splash-subtitle').textContent = isDark ? "퇴근 후 퀘스트를 시작하라!" : "점심 퀘스트를 시작하라!";
        document.getElementById('splash-quest-msg').textContent = isDark ? "용사여, 지갑을 들고 밤의 던전으로 떠나라!" : "용사여, 숟가락 무기 들고 던전으로 떠나 전리품을 획득하라!";
        document.getElementById('mode-text').textContent = isDark ? "DARK MODE" : "LIGHT MODE";

        // 지도 화면
        document.getElementById('map-title').textContent = isDark ? "학동 술집" : "학동 맛집";
        document.getElementById('map-subtitle').textContent = isDark ? "(밤의 탐색 준비 완료!)" : "(던전 탐색 준비 완료!)";
    
        // 도감 화면
        document.getElementById('bestiary-title').textContent = isDark ? "📖 밤의 도감" : "📖 몬스터 도감";
        document.getElementById('bestiary-subtitle').textContent = isDark ? "(학동 밤 던전 출몰 리스트)" : "(학동 던전 출몰 몬스터 리스트)";
    
        // 랜덤 뽑기 화면
        document.getElementById('randomizer-title').textContent = isDark ? "🎲 오늘의 목적지 찾기!" : "🎲 오늘의 보스 몬스터 찾기!";
        document.getElementById('randomizer-option-title').textContent = isDark ? "유흥 타입 선택" : "몬스터 타입 선택";
    }

    // ==============================================
    // 5. 지도 마커 표시
    // ==============================================
    function displayMapMarkers(data) {
        if (!markerLayerGroup) return;
        markerLayerGroup.clearLayers();

        const typeToIconClass = type => `icon-${type.replace(/&/g, '')}`;

        data.forEach(item => {
            const iconClass = typeToIconClass(item.type);
            const pixelIcon = L.divIcon({
                className: `pixel-marker-icon ${iconClass}`,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            const marker = L.marker([item.lat, item.lng], { icon: pixelIcon });
            marker.bindPopup(`<b>${item.name} (${item.type})</b><br>평점: ${'⭐'.repeat(item.rating)}<br>시간: ${item.distance_desc}`);
            markerLayerGroup.addLayer(marker);
        });
    }

    // ==============================================
    // 6. 도감 리스트 및 모달 기능
    // ==============================================
    function displayBestiaryList(data) {
        const bestiaryList = document.getElementById('bestiary-list');
        bestiaryList.innerHTML = '';
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'bestiary-card';
            
            card.innerHTML = `
                <img src="${item.photo}" alt="${item.name} 이미지">
                <h3>No.${item.id} ${item.name}</h3>
                <div class="stats">
                    <span class="type">🍻 타입: ${item.type}</span>
                    <span class="exp">✨ 평점: ${'⭐'.repeat(item.rating)}</span>
                </div>
            `;

            card.addEventListener('click', () => showBestiaryDetail(item));
            bestiaryList.appendChild(card);
        });
    }

    function showBestiaryDetail(item) {
        const modalBody = document.getElementById('modal-body');

        let difficultyIcon = '🔴 (어려움)';
        if (item.cleanliness >= 4) difficultyIcon = '🟢 (쉬움)';
        else if (item.cleanliness >= 3) difficultyIcon = '🟡 (보통)';

        const menuHtml = item.menu.map(menuItem => `
            <div class="modal-menu-item">
                <span class="menu-name">${menuItem.name}</span>
                <span class="menu-price">${menuItem.price ? parseInt(menuItem.price).toLocaleString() + ' GOLD' : '변동'}</span>
            </div>
        `).join('');

        const reviewsHtml = item.reviews && item.reviews.length > 0 
            ? `<div class="modal-reviews">
                   <h4>⚔️ 용사들의 후기</h4>
                   ${item.reviews.map(review => `<div class="modal-review-item">${review}</div>`).join('')}
               </div>`
            : '';

        modalBody.innerHTML = `
            <h3>No.${item.id} ${item.name}</h3>
            <img src="${item.photo}" alt="${item.name} 이미지">
            <div class="modal-info">
                <span>🍻 타입: ${item.type}</span>
                <span>✨ 평점: ${'⭐'.repeat(item.rating)}</span>
                <span>⏰ 퀘스트 시간: ${item.distance_desc}</span>
                <span>⚔️ 난이도: ${difficultyIcon}</span>
            </div>
            <div class="modal-menu">
                <h4>📜 대표 전리품 (메뉴)</h4>
                ${menuHtml}
            </div>
            ${reviewsHtml}
        `;
        bestiaryModal.classList.add('active');
    }

    // ==============================================
    // 7. 랜덤 뽑기 기능
    // ==============================================
    function setupRandomizerOptions(data) {
        const uniqueTypes = [...new Set(data.map(item => item.type))];
        typeBtnContainer.innerHTML = '<button class="type-btn" data-type="all">전체</button>';
        uniqueTypes.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'type-btn';
            btn.dataset.type = type;
            btn.textContent = type;
            typeBtnContainer.appendChild(btn);
        });
    }

    typeBtnContainer.addEventListener('click', (e) => {
        if (!e.target.matches('.type-btn')) return;

        const clickedBtn = e.target;
        const isAllBtn = clickedBtn.dataset.type === 'all';
        const typeButtons = typeBtnContainer.querySelectorAll('.type-btn');
        const allBtn = typeBtnContainer.querySelector('[data-type="all"]');
        const otherButtons = Array.from(typeButtons).filter(btn => btn.dataset.type !== 'all');

        if (isAllBtn) {
            const isNowActive = !allBtn.classList.contains('active');
            allBtn.classList.toggle('active', isNowActive);
            otherButtons.forEach(btn => btn.classList.toggle('active', isNowActive));
        } else {
            clickedBtn.classList.toggle('active');
            const allOthersActive = otherButtons.every(btn => btn.classList.contains('active'));
            allBtn.classList.toggle('active', allOthersActive);
        }
    });

    drawBtn.addEventListener('click', () => {
        const categoryToDisplay = isDarkMode ? 2 : 1;
        const currentData = allData.filter(item => item.category === categoryToDisplay);

        const selectedTypes = Array.from(typeBtnContainer.querySelectorAll('.type-btn'))
            .filter(btn => btn.classList.contains('active') && btn.dataset.type !== 'all')
            .map(btn => btn.dataset.type);

        let filteredList = [];
        if (selectedTypes.length > 0) {
            filteredList = currentData.filter(r => selectedTypes.includes(r.type));
        } else {
            // 아무것도 선택 안했으면 전체에서
            filteredList = currentData;
        }

        let shuffledList = [...filteredList].sort(() => 0.5 - Math.random());
        
        const top3 = shuffledList.slice(0, 3);
        
        resultsContainer.innerHTML = '';
        
        if (top3.length > 0) {
            const medals = ['🥇 1st LEGENDARY!', '🥈 2nd EPIC!', '🥉 3rd RARE!'];
            top3.forEach((item, index) => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.innerHTML = `
                    <span class="medal">${medals[index]}</span>
                    <span class="name">${item.name} (${item.type})</span>
                    <span class="exp-gold">✨ ${'⭐'.repeat(item.rating)}</span>
                `;
                resultsContainer.appendChild(resultItem);
            });
        } else {
            resultsContainer.innerHTML = `<p class="exp-gold">${isDarkMode ? '퀘스트 실패! 해당 타입의 술집이 없거나 타입을 선택하지 않았습니다.' : '퀘스트 실패! 해당 타입의 몬스터가 없거나 타입을 선택하지 않았습니다.'}</p>`;
        }
    });

    showScreen('splash-screen');
});
