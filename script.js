document.addEventListener('DOMContentLoaded', () => {
    // 전역 변수
    let allRestaurants = [];
    let map;

    // 본부(HQ) 위치
    const HQ_LAT = 37.5167791;
    const HQ_LNG = 127.0320472;
    const DEFAULT_ZOOM = 16;

    // 화면 요소
    const screens = document.querySelectorAll('.screen');
    const startBtn = document.getElementById('start-btn');
    const goToBestiaryBtn = document.getElementById('go-to-bestiary-btn');
    const goToRandomizerBtn = document.getElementById('go-to-randomizer-btn');
    const backToMapFromBestiaryBtn = document.getElementById('back-to-map-from-bestiary-btn');
    const backToMapFromRandomizerBtn = document.getElementById('back-to-map-from-randomizer-btn');
    const drawBtn = document.getElementById('draw-btn');
    const bestiaryModal = document.getElementById('bestiary-modal');
    const modalCloseBtn = bestiaryModal.querySelector('.close-btn');

    // 화면 전환 함수
    function showScreen(screenId) {
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        const nextScreen = document.getElementById(screenId);
        if (nextScreen) {
            nextScreen.classList.add('active');
            if (screenId === 'map-screen' && map) {
                setTimeout(() => map.invalidateSize(), 400); 
            }
        }
    }

    // ==============================================
    // 1. 네비게이션 이벤트 리스너
    // ==============================================
    const handleStart = () => showScreen('map-screen');
    startBtn.addEventListener('click', handleStart);
    startBtn.addEventListener('touchstart', handleStart);

    goToBestiaryBtn.addEventListener('click', () => {
        showScreen('bestiary-screen');
        displayBestiaryList(allRestaurants);
    });

    goToRandomizerBtn.addEventListener('click', () => showScreen('randomizer-screen'));
    backToMapFromBestiaryBtn.addEventListener('click', () => showScreen('map-screen'));
    backToMapFromRandomizerBtn.addEventListener('click', () => showScreen('map-screen'));

    // 모달 닫기 이벤트
    modalCloseBtn.addEventListener('click', () => bestiaryModal.classList.remove('active'));
    bestiaryModal.addEventListener('click', (e) => {
        if (e.target === bestiaryModal) {
            bestiaryModal.classList.remove('active');
        }
    });

    // ==============================================
    // 2. 지도 초기화 (*** 지도 색상 수정 ***)
    // ==============================================
    function initMap() {
        if (map) return;
        map = L.map('map').setView([HQ_LAT, HQ_LNG], DEFAULT_ZOOM);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(map);

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
            allRestaurants = data;
            initMap(); 
            displayMapMarkers(allRestaurants);
        })
        .catch(error => console.error('데이터 로딩 오류:', error));

    // ==============================================
    // 4. 지도 마커 표시
    // ==============================================
    function displayMapMarkers(restaurants) {
        function getIconClassForType(type) {
            switch (type) {
                case '한식': return 'icon-korean';
                case '일식': return 'icon-japanese';
                case '중식': return 'icon-chinese';
                case '양식': return 'icon-western';
                case '카페': return 'icon-cafe';
                case '아시안': return 'icon-asian';
                case '패스트푸드': return 'icon-fast-food';
                case '분식': return 'icon-bunsik';
                case '샐러드&샌드위치': return 'icon-salad-sandwich';
                default: return 'icon-other';
            }
        }

        restaurants.forEach(restaurant => {
            const iconClass = getIconClassForType(restaurant.type);
            const pixelIcon = L.divIcon({
                className: `pixel-marker-icon ${iconClass}`,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            const marker = L.marker([restaurant.lat, restaurant.lng], { icon: pixelIcon }).addTo(map);
            marker.bindPopup(`<b>${restaurant.name} (${restaurant.type})</b><br>EXP: +${restaurant.rating}<br>시간: ${restaurant.distance_desc}`);
        });
    }

    // ==============================================
    // 5. 몬스터 도감 리스트 및 모달 기능 (*** crosswalks 제거 ***)
    // ==============================================
    const bestiaryList = document.getElementById('bestiary-list');

    function displayBestiaryList(restaurants) {
        bestiaryList.innerHTML = '';
        restaurants.forEach(restaurant => {
            const card = document.createElement('div');
            card.className = 'bestiary-card';
            
            card.innerHTML = `
                <img src="${restaurant.photo}" alt="${restaurant.name} 몬스터 이미지">
                <h3>No.${restaurant.id} ${restaurant.name}</h3>
                <div class="stats">
                    <span class="type">🍖 타입: ${restaurant.type}</span>
                    <span class="exp">✨ 획득 EXP: +${restaurant.rating}</span>
                </div>
            `;

            card.addEventListener('click', () => showBestiaryDetail(restaurant));
            bestiaryList.appendChild(card);
        });
    }

    function showBestiaryDetail(restaurant) {
        const modalBody = document.getElementById('modal-body');

        let difficultyIcon = '🔴 (어려움)';
        if (restaurant.cleanliness >= 4) {
            difficultyIcon = '🟢 (쉬움)';
        } else if (restaurant.cleanliness >= 3) {
            difficultyIcon = '🟡 (보통)';
        }

        const menuHtml = restaurant.menu.map(item => `
            <div class="modal-menu-item">
                <span class="menu-name">${item.name}</span>
                <span class="menu-price">${parseInt(item.price).toLocaleString()} GOLD</span>
            </div>
        `).join('');

        const reviewsHtml = restaurant.reviews && restaurant.reviews.length > 0 
            ? `
                <div class="modal-reviews">
                    <h4>⚔️ 용사들의 후기</h4>
                    ${restaurant.reviews.map(review => `<div class="modal-review-item">${review}</div>`).join('')}
                </div>
            `
            : '';

        modalBody.innerHTML = `
            <h3>No.${restaurant.id} ${restaurant.name}</h3>
            <img src="${restaurant.photo}" alt="${restaurant.name} 몬스터 이미지">
            
            <div class="modal-info">
                <span>🍖 타입: ${restaurant.type}</span>
                <span>✨ 획득 EXP: +${restaurant.rating}</span>
                <span>⏰ 퀘스트 시간: ${restaurant.distance_desc}</span>
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
    // 6. 랜덤 뽑기 기능 (*** 다중 선택 로직으로 수정 ***)
    // ==============================================
    const typeBtnContainer = document.getElementById('type-btn-group');
    const typeButtons = typeBtnContainer.querySelectorAll('.type-btn');
    const resultsContainer = document.getElementById('random-results');

    typeBtnContainer.addEventListener('click', (e) => {
        if (!e.target.matches('.type-btn')) return;

        const clickedBtn = e.target;
        const isAllBtn = clickedBtn.dataset.type === 'all';
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
        const selectedTypes = Array.from(typeButtons)
            .filter(btn => btn.classList.contains('active') && btn.dataset.type !== 'all')
            .map(btn => btn.dataset.type);

        let filteredList = [];
        if (selectedTypes.length > 0) {
            filteredList = allRestaurants.filter(r => selectedTypes.includes(r.type));
        }

        let shuffledList = [...filteredList];
        for (let i = shuffledList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledList[i], shuffledList[j]] = [shuffledList[j], shuffledList[i]];
        }
        
        const top3 = shuffledList.slice(0, 3);
        
        resultsContainer.innerHTML = '';
        
        if (top3.length > 0) {
            const medals = ['🥇 1st LEGENDARY MEAL!', '🥈 2nd EPIC MEAL!', '🥉 3rd RARE MEAL!'];
            top3.forEach((item, index) => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                
                let totalGold = 0;
                if (item.menu && item.menu.length > 0) {
                    const priceString = item.menu[0].price.replace(/[^0-9]/g, '');
                    totalGold = parseInt(priceString, 10) || 0;
                }

                resultItem.innerHTML = `
                    <span class="medal">${medals[index]}</span>
                    <span class="name">${item.name} (${item.type})</span>
                    <span class="exp-gold">✨ EXP +${item.rating} 💰 GOLD ${totalGold.toLocaleString()}</span>
                `;
                resultsContainer.appendChild(resultItem);
            });
        } else {
            resultsContainer.innerHTML = '<p class="exp-gold">퀘스트 실패! 해당 타입의 몬스터가 없거나 타입을 선택하지 않았습니다.</p>';
        }
    });

    // ==============================================
    // 7. 스와이프 페이지 전환 기능
    // ==============================================
    const swipeScreens = ['map-screen', 'bestiary-screen', 'randomizer-screen'];
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    document.body.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.body.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe(e);
    });

    function handleSwipe(event) {
        const activeScreen = document.querySelector('.screen.active');
        if (!activeScreen || activeScreen.id === 'splash-screen') return;

        if (bestiaryModal.classList.contains('active')) return;

        const target = event.target;
        if (target.closest('#map')) return;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        if (Math.abs(deltaX) < Math.abs(deltaY) || Math.abs(deltaX) < 50) {
            return;
        }

        const currentIndex = swipeScreens.indexOf(activeScreen.id);
        if (currentIndex === -1) return;

        let nextIndex;
        if (deltaX < 0) {
            nextIndex = (currentIndex + 1) % swipeScreens.length;
        } else {
            nextIndex = (currentIndex - 1 + swipeScreens.length) % swipeScreens.length;
        }
        
        const nextScreenId = swipeScreens[nextIndex];
        showScreen(nextScreenId);

        if (nextScreenId === 'bestiary-screen') {
            displayBestiaryList(allRestaurants);
        }
    }

    showScreen('splash-screen');
});