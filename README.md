# WRTN 크래커 표시 확장 프로그램

WRTN(뤼튼) 사이트에서 크래커(크레딧) 정보를 상단 헤더에 항상 표시해주는 Tampermonkey 확장 프로그램입니다.

## 📌 주요 기능

- **상단 헤더에 크래커 표시**: 슈퍼챗 버튼 좌측에 크래커 잔액 표시
- **깔끔한 디자인**: 쿠키 이모지(🍪)와 함께 직관적으로 표시
- **실시간 업데이트**: 3초마다 자동으로 크래커 정보를 업데이트합니다
- **반응형 디자인**: PC와 모바일 환경 모두에서 최적화된 표시
- **클릭 가능**: 크래커 표시를 클릭하면 사이드바 메뉴가 열립니다
- **자동 복구**: 페이지 전환 시에도 자동으로 재설정됩니다

## 🚀 설치 방법

### 1. Tampermonkey 설치
먼저 브라우저에 Tampermonkey 확장 프로그램을 설치해야 합니다:
- [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 2. 스크립트 설치
1. Tampermonkey 아이콘 클릭 → "대시보드" 선택
2. "새 스크립트 생성" 버튼 클릭
3. 기본 템플릿을 모두 지우고 `wrtn-cracker-display.user.js` 파일의 내용을 복사하여 붙여넣기
4. Ctrl+S (또는 Cmd+S) 눌러서 저장

### 3. 사용하기
- WRTN 사이트(https://crack.wrtn.ai/ 또는 https://wrtn.ai/)에 접속하면 자동으로 작동합니다
- 상단 헤더 우측에 크래커 표시가 나타납니다

## 🎨 표시 형태

### PC 버전
```
[ 🍪 7,985 ]
```
- 슈퍼챗 버튼 좌측에 쿠키색 배경의 둥근 버튼 형태로 표시
- 마우스 호버 시 확대 효과

### 모바일 버전
```
[ 🍪 7,985 ]
```
- 작은 크기로 최적화
- 터치 친화적인 디자인

## ⚙️ 설정 옵션

스크립트 상단의 `CONFIG` 객체에서 다음 설정을 변경할 수 있습니다:

```javascript
const CONFIG = {
    updateInterval: 3000, // 업데이트 주기 (밀리초)
    retryDelay: 1000,     // 재시도 간격
    maxRetries: 10,       // 최대 재시도 횟수
    debugMode: false      // 디버그 모드 (콘솔 로그 출력)
};
```

## 🐛 문제 해결

### 크래커가 표시되지 않는 경우
1. 페이지를 새로고침(F5)해보세요
2. `CONFIG.debugMode`를 `true`로 변경하고 콘솔 로그를 확인하세요
3. Tampermonkey가 활성화되어 있는지 확인하세요

### 업데이트가 안 되는 경우
- 사이드바 메뉴를 한 번 열었다가 닫아보세요
- 브라우저 캐시를 삭제하고 다시 시도해보세요

## 📝 업데이트 내역

### v1.1.0 (2024)
- 디자인 개선: 쿠키 이모지(🍪)로 변경
- 위치 변경: 슈퍼챗 버튼 좌측에 표시
- 색상 테마를 쿠키색으로 변경
- 모바일 최적화 개선

### v1.0.0 (2024)
- 최초 릴리즈
- 기본 크래커 표시 기능
- 모바일/PC 반응형 지원
- 자동 업데이트 기능

## 🤝 기여

버그 리포트나 기능 제안은 환영합니다! 
