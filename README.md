# HML 검수 도구

문제은행 마스터 CMS에서 HML 원본과 HTML을 비교하는 도구입니다. CMS 화면을 읽기만 하고 데이터를 바꾸지 않습니다.

- 설치 페이지: https://kimbbab.github.io/hml-check/
- `quick.js`: 바로 검사(ver2) 본체. 확장(`extension/`)과 즐겨찾기가 열 때마다 이 파일의 최신판을 받아 씁니다.
- `ai3.js`: AI 눈검수(ver3) 본체. `extension-ai3/` 확장(바로 검사 + AI 눈검수)이 받아 씀. API 키는 확장 설정(이 PC)에만 저장되고 이 저장소에는 없음. 설치: https://kimbbab.github.io/hml-check/ai3.html
- `editnav.js`: 수정 도우미(ver1) 본체.
- `src/`: 원본 소스. 고친 뒤 배포판(`quick.js`, `editnav.js`)을 다시 만들어 올립니다.
