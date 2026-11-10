# NEWSCAPE — Architectural & Cinematic Scrollytelling Exhibition

> **"Leave the noise, Find the flat."**  
> 예술과 자연, 그리고 인간이 유기적으로 연결되는 공간 — 김포 한강 하구의 개방형 건축 스튜디오 **NEWSCAPE** 공식 온라인 전시 웹사이트.

---

## 🏛️ Project Overview

* **설계 / Architecture**: 오드투에이 ODETO.A (이희원, 정은주)
* **시공 / Construction**: 무일건설㈜ MOOIL (문인호, 김범수)
* **사진 / Photography**: 장민승 작가 (Jang Minseung)
* **위치**: 경기도 김포시 고촌읍 신곡리 515-3 (신곡로18번길 50)
* **오픈 일자**: 2026년 10월 9일

---

## ✨ Key Features & Interactions

1. **건축 도면 펜 스케치 인트로 애니메이션 (Architectural Blueprint Loader)**
   * N·E·W·S 사방 방위 자오선과 위도선의 정교한 펜 드로잉
   * 북(N)·동(E)·서(W)·남(S) 파빌리온과 곶(CAPE) 스튜디오의 5개 공간 윤곽선 스케치 및 먹 채움 시퀀스
   * NEWSCAPE 로고 안착 후 시네마틱 디졸브 전환

2. **3D 순수 라인 드로잉 철새 비행 시스템 (Three.js Quill 3D Line Flock)**
   * 고로 후지타(Goro Fujita) 화풍의 섬세한 3D 라인 드로잉 철새 무리
   * 화면 좌우측을 호위하는 2마리의 웅장한 전경 철새(Majestic Pair)와 원거리 상공을 유영하는 배경 철새 떼
   * 스크롤 속도 및 방향에 반응하는 유기적인 날갯짓(Flapping)과 활공(Gliding), 스크롤 모멘텀 추적

3. **노거수 미루나무 펜 드로잉 잎 & 가지 낙하 (Pure Quill Leaves & Twigs)**
   * 03번 챕터(노거수 미루나무) 도달 시 공중에서 흩날리며 떨어지는 입체 펜화 나뭇잎과 잔가지
   * 바닥 지면에 안착한 후 스크롤 바람과 기류에 따라 바닥을 굴러가는 지면 축적 물리학 시뮬레이션

4. **사진 프레임 스크래치 펜 테두리 (Quill Pen Frame Overlay)**
   * 기계적 사각 테두리 대신 아티스트의 손맛이 살아있는 4개 모서리 오버슈트(Corner Overshoots) 교차선
   * 45° 펜 해칭 스크래치 및 SVG 터뷸런스 잉크 텍스처 필터 연동
   * 3D 마우스 틸트(Optical Tilt) 및 스크롤 시 순백의 잉크 포커스 반응

5. **정밀 세로 영문 타이포그래피 스트림 (Middle Kinetic Typography)**
   * 본문 스크롤 위치와 1:1로 정밀하게 연동되는 11개 챕터의 거대한 세로 영문 레일
   * 텍스트 10px 우측에 세워진 수직 1px 건축 그리드 라인

6. **Web Audio 시네마틱 앰비언스 사운드스케이프**
   * 합성된 핑크 노이즈와 LFO 필터링을 통한 은은한 한강변 바람 소리 및 물결 파동 생성
   * 모노크롬 미니멀 벡터 사운드 토글 UI

---

## 🛠️ Tech Stack

* **Core**: HTML5, CSS3, Modern ES Modules Vanilla JavaScript
* **3D Graphics**: Three.js (WebGL Line & Spline Rendering, Catmull-Rom Curves)
* **Smooth Scrolling**: Lenis Scroll Engine
* **Typography**: Maru Buri (마루 부리), Cormorant Garamond, Cinzel, Noto Serif KR
* **Media**: Vimeo Background Video Stream, WebP/WebM Optimized Imagery

---

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/akira2833/newscape.git

# Serve with any static web server
npx serve .
# or
python -m http.server 4173
```
브라우저에서 `http://localhost:4173` 접속.
