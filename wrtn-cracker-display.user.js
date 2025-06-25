// ==UserScript==
// @name         WRTN 크래커 표시
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  WRTN 사이트의 크래커(크레딧) 정보를 상단 헤더에 항상 표시
// @author       케츠
// @match        https://crack.wrtn.ai/*
// @match        https://wrtn.ai/*
// @icon         https://crack.wrtn.ai/favicon.ico
// @updateURL    https://github.com/tincansimagine/cracker_viewer/raw/refs/heads/main/wrtn-cracker-display.user.js
// @downloadURL  https://github.com/tincansimagine/cracker_viewer/raw/refs/heads/main/wrtn-cracker-display.user.js
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 설정
    const CONFIG = {
        updateInterval: 3000, // 3초마다 업데이트
        retryDelay: 1000,     // 재시도 간격
        maxRetries: 10,       // 최대 재시도 횟수
        debugMode: false      // 디버그 모드
    };

    // 디버그 로그
    const debug = (...args) => {
        if (CONFIG.debugMode) {
            console.log('[WRTN 크래커]', ...args);
        }
    };

    // 크래커 표시 클래스
    class CrackerDisplay {
        constructor() {
            this.crackerAmount = null;
            this.displayElement = null;
            this.observer = null;
            this.updateTimer = null;
            this.retryCount = 0;
            this.isMobile = window.innerWidth <= 768;
            this.isMenuOpen = false;
        }

        // 초기화
        async init() {
            debug('초기화 시작...');

            // 반응형 리사이즈 이벤트
            window.addEventListener('resize', () => {
                this.isMobile = window.innerWidth <= 768;
                this.updateDisplayStyle();
            });

            // 페이지 변경 감지
            this.observePageChanges();

            // 채팅방 페이지인 경우에만 크래커 표시 설정
            if (this.isChatPage()) {
                debug('채팅방 페이지에서 초기화');
                // 약간의 지연 후 설정 (페이지 로딩 완료 대기)
                setTimeout(() => this.setupCrackerDisplay(), 1500);
            } else {
                debug('채팅방이 아닌 페이지. 크래커 표시 설정 건너뜀');
            }

            // 정기적 업데이트 (채팅방에서만)
            this.startPeriodicUpdate();
        }

        // 페이지 변경 감지
        observePageChanges() {
            let currentUrl = window.location.href;

            const observer = new MutationObserver(() => {
                // URL 변경 감지
                if (window.location.href !== currentUrl) {
                    currentUrl = window.location.href;
                    debug('페이지 변경 감지:', currentUrl);

                    // 채팅방 페이지로 이동했을 때만 설정
                    if (this.isChatPage()) {
                        debug('채팅방 페이지로 이동. 크래커 표시 재설정...');
                        setTimeout(() => this.setupCrackerDisplay(), 1000);
                    } else {
                        // 채팅방이 아닌 페이지에서는 크래커 표시 제거
                        if (this.displayElement) {
                            this.displayElement.remove();
                            this.displayElement = null;
                            debug('채팅방이 아닌 페이지. 크래커 표시 제거');
                        }
                    }
                }

                // 크래커 표시가 사라졌는지 확인 (채팅방에서만)
                if (this.isChatPage() && this.displayElement && !document.body.contains(this.displayElement)) {
                    debug('크래커 표시가 제거됨. 재설정...');
                    this.setupCrackerDisplay();
                }

                // 챗 버튼이 새로 생겼는지 확인
                if (this.isChatPage() && !this.displayElement) {
                    const chatButton = document.querySelector('button:has(img[alt="일반챗"]), button:has(img[alt="슈퍼챗"]), button:has(img[src*="chat"])');
                    if (chatButton) {
                        debug('챗 버튼 발견. 크래커 표시 설정...');
                        this.setupCrackerDisplay();
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // URL 변경 이벤트도 감지 (History API 사용 시)
            window.addEventListener('popstate', () => {
                setTimeout(() => {
                    if (this.isChatPage()) {
                        this.setupCrackerDisplay();
                    }
                }, 500);
            });
        }

        // 크래커 표시 설정
        async setupCrackerDisplay() {
            try {
                // 헤더 찾기
                const header = await this.findHeader();
                if (!header) {
                    throw new Error('헤더를 찾을 수 없습니다.');
                }

                // 기존 표시 요소 제거
                if (this.displayElement) {
                    this.displayElement.remove();
                }

                // 크래커 표시 요소 생성
                this.createDisplayElement();

                // 헤더에 추가
                this.addToHeader(header);

                // 크래커 정보 업데이트
                await this.updateCrackerInfo();

            } catch (error) {
                debug('설정 실패:', error);
                if (this.retryCount < CONFIG.maxRetries) {
                    this.retryCount++;
                    setTimeout(() => this.setupCrackerDisplay(), CONFIG.retryDelay);
                }
            }
        }

        // 헤더 찾기 (채팅방 헤더만 대상)
        async findHeader() {
            // 먼저 슈퍼챗 버튼이 있는 헤더를 찾기 (채팅방 헤더 확인)
            const chatHeaderSelectors = [
                'div[display="flex"][class*="css-1bhbevm"]', // 제공된 슈퍼챗 버튼 부모
                'div:has(button:has(img[alt="슈퍼챗"]))',
                'div:has(button:has(img[src*="superchat"]))',
                'div:has(button:has(p:contains("슈퍼챗")))'
            ];

            // 슈퍼챗 버튼이 있는 헤더 찾기
            for (const selector of chatHeaderSelectors) {
                try {
                    const header = document.querySelector(selector);
                    if (header) {
                        debug('채팅 헤더 발견:', selector);
                        return header.closest('div[display="flex"]') || header;
                    }
                } catch (e) {
                    // 선택자 오류 무시
                }
            }

            // 슈퍼챗 버튼을 직접 찾아서 부모 헤더 찾기
            const superchatButtons = document.querySelectorAll('button');
            for (const button of superchatButtons) {
                const img = button.querySelector('img[alt="슈퍼챗"], img[src*="superchat"]');
                const text = button.querySelector('p');

                if (img || (text && text.textContent.includes('슈퍼챗'))) {
                    debug('슈퍼챗 버튼 발견, 부모 헤더 찾는 중...');

                    // 부모 요소들 중에서 헤더 역할을 하는 요소 찾기
                    let parent = button.parentElement;
                    while (parent && parent !== document.body) {
                        const display = parent.getAttribute('display') || window.getComputedStyle(parent).display;
                        const width = parent.getAttribute('width') || window.getComputedStyle(parent).width;

                        // 헤더 조건: flex 레이아웃이고 너비가 넓은 요소
                        if (display === 'flex' && (width === '100%' || parent.offsetWidth > window.innerWidth * 0.8)) {
                            debug('슈퍼챗 버튼의 헤더 발견');
                            return parent;
                        }
                        parent = parent.parentElement;
                    }

                    // 직접 부모가 헤더인 경우
                    return button.parentElement;
                }
            }

            // 폴백: 기존 방식
            const fallbackSelectors = [
                'div[display="flex"][width="100%"]',
                'header',
                'nav'
            ];

            for (const selector of fallbackSelectors) {
                const header = document.querySelector(selector);
                if (header) {
                    // 채팅방인지 확인
                    if (this.isChatPage()) {
                        debug('폴백 헤더 발견:', selector);
                        return header;
                    }
                }
            }

            return null;
        }

        // 채팅방 페이지인지 확인
        isChatPage() {
            const url = window.location.href;
            return url.includes('/c/') || // 채팅방 URL 패턴
                   url.includes('/chat/') ||
                   document.querySelector('button:has(img[alt="일반챗"]), button:has(img[alt="슈퍼챗"]), button:has(img[src*="chat"])') !== null; // 챗 버튼 존재
        }

        // 크래커 표시 요소 생성
        createDisplayElement() {
            this.displayElement = document.createElement('div');
            this.displayElement.id = 'wrtn-cracker-display';

            // 기본 스타일
            const baseStyles = {
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '18px',
                backgroundColor: 'rgba(139, 90, 43, 0.08)',
                border: '1px solid rgba(139, 90, 43, 0.2)',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
            };

            // 모바일 스타일 조정
            if (this.isMobile) {
                baseStyles.padding = '5px 10px';
                baseStyles.fontSize = '12px';
                baseStyles.marginRight = '8px';
                baseStyles.gap = '4px';
            }

            Object.assign(this.displayElement.style, baseStyles);

            // 호버 효과
            this.displayElement.addEventListener('mouseenter', () => {
                this.displayElement.style.backgroundColor = 'rgba(139, 90, 43, 0.15)';
                this.displayElement.style.transform = 'scale(1.05)';
            });

            this.displayElement.addEventListener('mouseleave', () => {
                this.displayElement.style.backgroundColor = 'rgba(139, 90, 43, 0.08)';
                this.displayElement.style.transform = 'scale(1)';
            });

            // 클릭 시 사이드바 열기
            this.displayElement.addEventListener('click', () => {
                this.toggleSidebar();
            });

            // 내용 설정
            this.updateDisplayContent();
        }

        // 표시 내용 업데이트
        updateDisplayContent() {
            if (!this.displayElement) return;

            const crackerText = this.crackerAmount !== null
                ? this.formatNumber(this.crackerAmount)
                : '로딩중...';

            const emojiSize = this.isMobile ? '14px' : '16px';
            this.displayElement.innerHTML = `
                <span style="font-size: ${emojiSize};">🍪</span>
                <span>${crackerText}</span>
            `;
        }

        // 숫자 포맷팅
        formatNumber(num) {
            if (num === null || num === undefined) return '0';
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        // 헤더에 추가 (일반챗/슈퍼챗 버튼 왼쪽에)
        addToHeader(header) {
            // 일반챗 또는 슈퍼챗 버튼 찾기
            let chatButton = null;

            // 방법 1: 일반챗 버튼 찾기 (제공된 구조)
            const normalChatButton = header.querySelector('button:has(img[alt="일반챗"])');
            if (normalChatButton) {
                chatButton = normalChatButton;
                debug('일반챗 버튼 발견');
            }

            // 방법 2: 슈퍼챗 버튼 찾기
            if (!chatButton) {
                const superchatButton = header.querySelector('button:has(img[alt="슈퍼챗"])');
                if (superchatButton) {
                    chatButton = superchatButton;
                    debug('슈퍼챗 버튼 발견');
                }
            }

            // 방법 3: 이미지 src로 찾기
            if (!chatButton) {
                const imgButtons = header.querySelectorAll('button img');
                for (const img of imgButtons) {
                    if (img.src.includes('standard.webp') || img.src.includes('superchat.webp') ||
                        img.src.includes('powerchat.webp') || img.src.includes('hyperchat.webp')) {
                        chatButton = img.closest('button');
                        debug('이미지 src로 챗 버튼 발견:', img.src);
                        break;
                    }
                }
            }

            // 방법 4: 텍스트로 찾기
            if (!chatButton) {
                const allButtons = header.querySelectorAll('button');
                for (const button of allButtons) {
                    const text = button.querySelector('p');
                    if (text && (text.textContent.includes('챗') || text.textContent.includes('chat'))) {
                        chatButton = button;
                        debug('텍스트로 챗 버튼 발견:', text.textContent);
                        break;
                    }
                }
            }

            // 방법 5: 클래스명으로 찾기
            if (!chatButton) {
                const classButtons = header.querySelectorAll('button[class*="css-10vup9s"], button[class*="css-b59yfh"]');
                for (const button of classButtons) {
                    const img = button.querySelector('img');
                    if (img && (img.alt.includes('챗') || img.src.includes('chat') || img.src.includes('standard'))) {
                        chatButton = button;
                        debug('클래스명으로 챗 버튼 발견');
                        break;
                    }
                }
            }

            if (chatButton) {
                // 챗 버튼의 부모 컨테이너 찾기
                const buttonContainer = chatButton.parentElement;

                // 크래커 표시를 챗 버튼 바로 앞(왼쪽)에 삽입
                buttonContainer.insertBefore(this.displayElement, chatButton);

                // 챗 버튼과의 간격 추가
                this.displayElement.style.marginRight = '16px'; // 챗 버튼과 16px 간격

                // 부모 컨테이너가 flex가 아니면 설정
                if (window.getComputedStyle(buttonContainer).display !== 'flex') {
                    buttonContainer.style.display = 'flex';
                    buttonContainer.style.alignItems = 'center';
                }

                debug('크래커 표시를 챗 버튼 왼쪽에 추가 완료');
            } else {
                // 챗 버튼을 찾지 못한 경우, 헤더 우측에 추가
                debug('챗 버튼을 찾지 못함. 헤더 우측에 추가');

                // 헤더의 우측 영역 찾기
                const rightSection = header.querySelector('div:last-child') || header;
                rightSection.appendChild(this.displayElement);

                // 헤더 스타일 설정
                if (window.getComputedStyle(header).display !== 'flex') {
                    header.style.display = 'flex';
                    header.style.alignItems = 'center';
                    header.style.justifyContent = 'space-between';
                }
            }
        }

        // 크래커 정보 업데이트
        async updateCrackerInfo() {
            try {
                // 먼저 사이드바가 열려있는지 확인
                let crackerElement = await this.findCrackerElement();

                // 찾지 못했으면 사이드바 열기
                if (!crackerElement && !this.isMenuOpen) {
                    debug('크래커 정보를 찾을 수 없음. 사이드바 열기 시도...');
                    await this.openSidebar();

                    // 다시 찾기
                    crackerElement = await this.findCrackerElement();
                }

                if (crackerElement) {
                    const crackerText = crackerElement.textContent.trim();
                    const crackerNumber = parseInt(crackerText.replace(/,/g, ''), 10);

                    if (!isNaN(crackerNumber)) {
                        this.crackerAmount = crackerNumber;
                        this.updateDisplayContent();
                        debug('크래커 정보 업데이트:', this.crackerAmount);
                    }
                }

                // 사이드바 자동으로 닫기 (옵션)
                if (this.isMenuOpen && !this.isMobile) {
                    setTimeout(() => this.closeSidebar(), 500);
                }

            } catch (error) {
                debug('크래커 정보 업데이트 실패:', error);
            }
        }

        // 크래커 요소 찾기
        async findCrackerElement() {
            const crackerSelectors = [
                'p.css-1xke5yy.endopat4', // 제공된 선택자
                'p[color="text_primary"]',
                '[class*="css-"][class*="endopat"]',
                'div[class*="css-kadffw"] p',
                'aside p[color="text_primary"]',
                'p:has-text("\\d+,\\d+")', // 숫자 패턴
                'span:has-text("\\d+,\\d+")'
            ];

            for (const selector of crackerSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    for (const el of elements) {
                        const text = el.textContent.trim();
                        // 숫자 형식 확인 (1,000 형태)
                        if (/^\d{1,3}(,\d{3})*$/.test(text)) {
                            debug('크래커 요소 발견:', selector, text);
                            return el;
                        }
                    }
                } catch (e) {
                    // 잘못된 선택자 무시
                }
            }

            // 더 일반적인 방법으로 찾기
            const allParagraphs = document.querySelectorAll('p, span');
            for (const p of allParagraphs) {
                const text = p.textContent.trim();
                if (/^\d{1,3}(,\d{3})*$/.test(text) && text.length >= 3) {
                    // 부모 요소 확인으로 더 정확하게
                    const parent = p.parentElement;
                    if (parent && parent.className && parent.className.includes('css-')) {
                        debug('일반 검색으로 크래커 발견:', text);
                        return p;
                    }
                }
            }

            return null;
        }

        // 사이드바 열기
        async openSidebar() {
            if (this.isMenuOpen) return;

            const menuButtonSelectors = [
                'div[width="32px"][height="32px"] svg', // 제공된 메뉴 버튼
                'button svg[viewBox="0 0 24 24"]',
                'button[class*="css-"][class*="endopat"]',
                'button:has(svg path[d*="M11 11h2v2h-2z"])', // 점 3개 패턴
                '[class*="menu-button"]',
                '[class*="hamburger"]'
            ];

            for (const selector of menuButtonSelectors) {
                try {
                    const element = document.querySelector(selector);
                    if (element) {
                        const button = element.closest('button') || element.closest('div[role="button"]') || element.parentElement;
                        if (button) {
                            debug('메뉴 버튼 클릭:', selector);
                            button.click();
                            this.isMenuOpen = true;

                            // 사이드바 열림 대기
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            return;
                        }
                    }
                } catch (e) {
                    // 오류 무시
                }
            }
        }

        // 사이드바 닫기
        closeSidebar() {
            if (!this.isMenuOpen) return;

            // 배경 클릭 또는 닫기 버튼 찾기
            const overlaySelectors = [
                '[class*="overlay"]',
                '[class*="backdrop"]',
                'div[style*="position: fixed"][style*="inset: 0"]'
            ];

            for (const selector of overlaySelectors) {
                const overlay = document.querySelector(selector);
                if (overlay) {
                    overlay.click();
                    this.isMenuOpen = false;
                    debug('사이드바 닫음');
                    return;
                }
            }
        }

        // 사이드바 토글
        toggleSidebar() {
            if (this.isMenuOpen) {
                this.closeSidebar();
            } else {
                this.openSidebar();
            }
        }

        // 표시 스타일 업데이트
        updateDisplayStyle() {
            if (!this.displayElement) return;

            if (this.isMobile) {
                this.displayElement.style.padding = '5px 10px';
                this.displayElement.style.fontSize = '12px';
                this.displayElement.style.marginRight = '8px';
                this.displayElement.style.gap = '4px';
            } else {
                this.displayElement.style.padding = '6px 14px';
                this.displayElement.style.fontSize = '14px';
                this.displayElement.style.marginRight = '12px';
                this.displayElement.style.gap = '6px';
            }
        }

        // 정기적 업데이트 시작
        startPeriodicUpdate() {
            // 기존 타이머 제거
            if (this.updateTimer) {
                clearInterval(this.updateTimer);
            }

            // 정기적으로 크래커 정보 업데이트 (채팅방에서만)
            this.updateTimer = setInterval(() => {
                if (this.isChatPage() && this.displayElement) {
                    this.updateCrackerInfo();
                }
            }, CONFIG.updateInterval);
        }

        // 정리
        destroy() {
            if (this.updateTimer) {
                clearInterval(this.updateTimer);
            }
            if (this.observer) {
                this.observer.disconnect();
            }
            if (this.displayElement) {
                this.displayElement.remove();
            }
        }
    }

    // 초기화 함수
    async function init() {
        // DOM 로드 대기
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // 약간의 지연 후 시작 (페이지 완전 로드 대기)
        setTimeout(() => {
            const crackerDisplay = new CrackerDisplay();
            crackerDisplay.init();

            // 전역 객체로 저장 (디버깅용)
            window.WRTNCrackerDisplay = crackerDisplay;
        }, 2000);
    }

    // 시작
    init();

})();
