# RPS GLTF Viewer

RPS(Rock-Paper-Scissors) 3D 모델을 브라우저에서 렌더링하는 GLTF 뷰어

## 🚀 기술 스택

- **React** 19.1.1
- **TypeScript** 5.9.3
- **Vite** 7.1.7
- **Three.js** 0.180.0

## 📁 프로젝트 구조

```
rps-gltf-viewer/
├── public/
│   ├── draco/                 # DRACO 디코더 파일
│   └── models/
│       ├── Multi_RPS.gltf     # RPS 3D 모델 (3.1 MB)
│       └── Multi_RPS.bin      # 바이너리 데이터 (2.6 MB)
├── src/
│   ├── components/
│   │   └── GLTFViewer.tsx     # 메인 3D 뷰어 컴포넌트 (292줄)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
└── package.json
```

## 🎯 주요 기능

- ✅ **GLTF/GLB 모델 로딩** - DRACO 압축 지원
- ✅ **자동 모델 스케일링** - 화면 크기에 맞춰 5 유닛으로 정규화
- ✅ **자동 카메라 피팅** - 모델 크기에 맞춰 최적 시점 자동 조정
- ✅ **OrbitControls** - 마우스로 회전/줌/팬 조작
- ✅ **조명 시스템** - Ambient + Directional Light
- ✅ **헬퍼** - Grid, Axes, BoundingBox 표시

## 🎮 사용 방법

### 마우스 조작
- **좌클릭 + 드래그**: 모델 회전
- **우클릭 + 드래그**: 카메라 팬 (이동)
- **휠**: 줌 인/아웃

## 🛠️ 개발 환경 설정

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```
브라우저에서 http://localhost:5173 접속

### 프로덕션 빌드
```bash
npm run build
npm run preview
```

## 📊 렌더링 통계

- **모델**: Multi_RPS.gltf
- **메시 수**: 6,883개
- **파일 크기**: 3.1 MB (GLTF) + 2.6 MB (BIN)
- **압축**: DRACO
- **재질**: PBR (Physically Based Rendering)

## 🔧 커스터마이징

### 다른 GLTF 모델 로드
`src/App.tsx` 수정:
```tsx
<GLTFViewer src="/models/YOUR_MODEL.gltf" />
```

### 배경색 변경
```tsx
<GLTFViewer src="/models/Multi_RPS.gltf" background={0x000000} />
```

### 헬퍼 숨기기
```tsx
<GLTFViewer src="/models/Multi_RPS.gltf" helpers={false} />
```

## 🐛 문제 해결

### 모델이 보이지 않는 경우
1. 브라우저 콘솔 확인 - 에러 메시지 확인
2. 파일 경로 확인 - GLTF 파일이 `public/models/` 에 있는지 확인
3. DRACO 디코더 - `public/draco/` 폴더에 디코더 파일이 있는지 확인
4. 하드 리프레시 - `Ctrl+Shift+R` 로 캐시 클리어

## ✅ 해결된 문제 (2025-10-23)

### 렌더링 실패 문제
- **원인**: 테스트 큐브가 모델을 가림 + 복잡한 코드 구조
- **해결**: GLTFViewer 컴포넌트 전면 재작성
  - 테스트 큐브 제거
  - 불필요한 디버그 기능 제거
  - 깔끔한 단일 책임 구조로 변경
  - AbortController로 메모리 누수 방지

---

**작성일**: 2025-10-23  
**버전**: 1.0.0
