document.addEventListener('DOMContentLoaded', () => {
    // 전역 변수로 데이터와 지도 객체 관리
    let allRestaurants = [];
    let map;

    // 본부(HQ) 위치 정의
    const HQ_LAT = 37.5167791;
    const HQ_LNG = 127.0320472;
    const DEFAULT_ZOOM = 16;

    // 화면 요소들 정의
    const screens = document.querySelectorAll('.screen');
    const startBtn = document.getElementById('start-btn');
    const goToBestiaryBtn = document.getElementById('go-to-bestiary-btn');
    const goToRandomizerBtn = document.getElementById('go-to-randomizer-btn');
    const backToMapFromBestiaryBtn = document.getElementById('back-to-map-from-bestiary-btn');
    const backToMapFromRandomizerBtn = document.getElementById('back-to-map-from-randomizer-btn');
    const drawBtn = document.getElementById('draw-btn');

    // 화면 전환 함수
    function showScreen(screenId) {
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        const nextScreen = document.getElementById(screenId);
        if (nextScreen) {
            nextScreen.classList.add('active');

            // ✅ 화면 전환 애니메이션 후 지도가 깨지는 것을 방지하는 코드
            if (screenId === 'map-screen' && map) {
                setTimeout(() => {
                    map.invalidateSize();
                }, 400); // CSS transition 시간과 일치
            }
        }
    }

    // ==============================================
    // 1. 네비게이션 (화면 전환) 이벤트 리스너 설정
    // ==============================================

    const handleStart = () => showScreen('map-screen');
    startBtn.addEventListener('click', handleStart);
    startBtn.addEventListener('touchstart', handleStart);

    goToBestiaryBtn.addEventListener('click', () => {
        showScreen('bestiary-screen');
        displayBestiaryList(allRestaurants);
    });

    goToRandomizerBtn.addEventListener('click', () => {
        showScreen('randomizer-screen');
    });

    backToMapFromBestiaryBtn.addEventListener('click', () => {
        showScreen('map-screen');
    });

    backToMapFromRandomizerBtn.addEventListener('click', () => {
        showScreen('map-screen');
    });

    // ==============================================
    // 2. 지도 초기화 및 본부 마커 추가
    // ==============================================
    function initMap() {
        if (map) return;
        map = L.map('map').setView([HQ_LAT, HQ_LNG], DEFAULT_ZOOM);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
    // 3. 데이터 로딩 및 앱 초기 설정
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
    // 5. 지도 마커 표시 함수 (맛집 몬스터)
    // ==============================================
    function displayMapMarkers(restaurants) {
        const pixelIcon = L.divIcon({
            className: 'pixel-marker-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        restaurants.forEach(restaurant => {
            const marker = L.marker([restaurant.lat, restaurant.lng], { icon: pixelIcon }).addTo(map);
            marker.bindPopup(`<b>${restaurant.name}</b><br>EXP: +${restaurant.rating}<br>시간: ${restaurant.distance}`);
        });
    }

    // ==============================================
    // 6. 몬스터 도감 리스트 표시 함수
    // ==============================================
    const bestiaryList = document.getElementById('bestiary-list');
    function displayBestiaryList(restaurants) {
        bestiaryList.innerHTML = '';
        restaurants.forEach(restaurant => {
            const card = document.createElement('div');
            card.className = 'bestiary-card';

            let difficultyIcon = '🔴 (어려움)';
            if (restaurant.cleanliness >= 4) {
                difficultyIcon = '🟢 (쉬움)';
            } else if (restaurant.cleanliness >= 3) {
                difficultyIcon = '🟡 (보통)';
            }
            
            let totalGold = 0;
            if (restaurant.menu && restaurant.menu.length > 0) {
                const priceString = restaurant.menu[0].price.replace(/[^0-9]/g, '');
                totalGold = parseInt(priceString, 10) || 0;
            }

            card.innerHTML = `
                <img src="${restaurant.photo}" alt="${restaurant.name} 몬스터 이미지">
                <h3>No.${restaurant.id} ${restaurant.name}</h3>
                <div class="stats">
                    <span class="exp">✨ 획득 EXP: +${restaurant.rating}</span>
                    <span class="gold">💰 예상 GOLD: ${totalGold.toLocaleString()}</span>
                    <span class="time">⏰ 퀘스트 시간: ${restaurant.distance}</span>
                    <span class="difficulty">⚔️ 난이도: ${difficultyIcon}</span>
                </div>
            `;
            bestiaryList.appendChild(card);
        });
    }

    // ==============================================
    // 7. 랜덤 뽑기 기능
    // ==============================================
    drawBtn.addEventListener('click', () => {
        const sortOption = document.querySelector('input[name="sort-option"]:checked').value;
        
        let sortedList = [...allRestaurants];
        
        if (sortOption === 'rating') {
            sortedList.sort((a, b) => b.rating - a.rating);
        } else if (sortOption === 'distance') {
            sortedList.sort((a, b) => a.distanceMinutes - b.distanceMinutes);
        }
        
        for (let i = sortedList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sortedList[i], sortedList[j]] = [sortedList[j], sortedList[i]];
        }
        
        const top3 = sortedList.slice(0, 3);
        
        const resultsContainer = document.getElementById('random-results');
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
                    <span class="name">${item.name}</span>
                    <span class="exp-gold">✨ EXP +${item.rating} 💰 GOLD ${totalGold.toLocaleString()}</span>
                `;
                resultsContainer.appendChild(resultItem);
            });
        } else {
            resultsContainer.innerHTML = '<p class="exp-gold">퀘스트 실패! 뽑을 식당이 없습니다.</p>';
        }
    });

    // ==============================================
    // 8. 스와이프 페이지 전환 기능
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
        handleSwipe();
    });

    function handleSwipe() {
        const activeScreen = document.querySelector('.screen.active');
        if (!activeScreen || activeScreen.id === 'splash-screen') return;

        // 지도 위에서는 스와이프 동작 방지
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
        if (deltaX < 0) { // 왼쪽으로 스와이프
            nextIndex = (currentIndex + 1) % swipeScreens.length;
        } else { // 오른쪽으로 스와이프
            nextIndex = (currentIndex - 1 + swipeScreens.length) % swipeScreens.length;
        }
        
        const nextScreenId = swipeScreens[nextIndex];
        showScreen(nextScreenId);

        if (nextScreenId === 'bestiary-screen') {
            displayBestiaryList(allRestaurants);
        }
    }

    // 앱 시작 시 가장 먼저 시작 화면을 표시
    showScreen('splash-screen');
});

