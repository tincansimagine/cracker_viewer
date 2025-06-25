// ==UserScript==
// @name         WRTN 크래커 표시
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  WRTN 사이트의 크래커(크레딧) 정보를 상단 헤더에 항상 표시
// @author       케츠
// @match        https://crack.wrtn.ai/*
// @match        https://wrtn.ai/*
// @icon         https://crack.wrtn.ai/favicon.ico
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

            // 크래커 정보 추출 및 표시
            await this.setupCrackerDisplay();

            // 정기적 업데이트
            this.startPeriodicUpdate();
        }

        // 페이지 변경 감지
        observePageChanges() {
            const observer = new MutationObserver(() => {
                // 헤더가 사라졌는지 확인
                if (this.displayElement && !document.body.contains(this.displayElement)) {
                    debug('크래커 표시가 제거됨. 재설정...');
                    this.setupCrackerDisplay();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
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

        // 헤더 찾기
        async findHeader() {
            // 다양한 헤더 선택자 시도
            const headerSelectors = [
                'div[display="flex"][width="100%"][height="48px"]',
                'header',
                '[class*="header"]',
                'div[class*="css-1tb8v3v"]',
                'div[class*="css-"][height="48px"]',
                'nav',
                'div[role="banner"]'
            ];

            for (const selector of headerSelectors) {
                const header = document.querySelector(selector);
                if (header) {
                    debug('헤더 발견:', selector);
                    return header;
                }
            }

            // 대기 후 재시도
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 더 일반적인 선택자로 재시도
            const flexDivs = document.querySelectorAll('div[display="flex"]');
            for (const div of flexDivs) {
                const height = div.getAttribute('height') || window.getComputedStyle(div).height;
                if (height === '48px' || height === '56px' || height === '64px') {
                    debug('플렉스 헤더 발견');
                    return div;
                }
            }

            return null;
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
                transition: 'all 0.3s ease',
                marginRight: '12px'
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

        // 헤더에 추가
        addToHeader(header) {
            // 슈퍼챗 또는 우측 영역 요소 찾기
            const targetSelectors = [
                // 슈퍼챗 관련 선택자들
                'button[aria-label*="슈퍼챗"]',
                'button[aria-label*="super"]',
                'button svg path[d*="M19.5"]', // 슈퍼챗 아이콘 경로
                'button:has(svg path[d*="M19.5"])', // 슈퍼챗 버튼
                '[class*="super"]',
                '[class*="chat"]',
                // 기존 선택자들 (폴백용)
                'div[class*="css-u4p24i"]', // 사용자 정보 영역
                'button[class*="css-4xpglp"]', // 프로필 버튼
                'div[class*="css-37zwmc"]', // 우측 영역
                'div[display="flex"]:last-child' // 마지막 플렉스 요소
            ];

            let targetElement = null;
            let insertBefore = true; // 기본적으로 앞에 삽입

            // 먼저 슈퍼챗 관련 요소 찾기
            for (let i = 0; i < targetSelectors.length; i++) {
                const selector = targetSelectors[i];
                try {
                    targetElement = header.querySelector(selector);
                    if (targetElement) {
                        debug('타겟 요소 발견:', selector);
                        // 슈퍼챗 관련 요소면 앞에 삽입
                        insertBefore = i < 6; // 처음 6개가 슈퍼챗 관련 선택자
                        break;
                    }
                } catch (e) {
                    // 잘못된 선택자 무시
                }
            }

            // 더 구체적으로 슈퍼챗 버튼 찾기 (SVG 아이콘 기반)
            if (!targetElement) {
                const allButtons = header.querySelectorAll('button');
                for (const button of allButtons) {
                    const svg = button.querySelector('svg');
                    if (svg && (svg.innerHTML.includes('M19.5') || button.getAttribute('aria-label')?.includes('슈퍼'))) {
                        targetElement = button;
                        insertBefore = true;
                        debug('슈퍼챗 버튼 발견 (SVG 검색)');
                        break;
                    }
                }
            }

            if (targetElement && insertBefore) {
                // 타겟 요소 앞에 삽입
                targetElement.parentNode.insertBefore(this.displayElement, targetElement);
            } else if (targetElement) {
                // 타겟 요소 뒤에 삽입
                targetElement.parentNode.insertBefore(this.displayElement, targetElement.nextSibling);
            } else {
                // 헤더의 마지막 자식으로 추가
                header.appendChild(this.displayElement);
                
                // 헤더가 flex가 아니면 설정
                if (window.getComputedStyle(header).display !== 'flex') {
                    header.style.display = 'flex';
                    header.style.alignItems = 'center';
                    header.style.justifyContent = 'space-between';
                }
            }

            debug('크래커 표시 추가 완료');
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

            // 정기적으로 크래커 정보 업데이트
            this.updateTimer = setInterval(() => {
                this.updateCrackerInfo();
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
