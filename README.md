# ⌨️ 단축키 키맵

노션 단축키 페이지를 읽어 JSON으로 저장하고, 3D 키보드 위에 단축키를 보여주는 정적 사이트입니다.
Node.js(동기화 스크립트·로컬 서버)와 바닐라 JS만 사용하며 외부 패키지가 없습니다.

## 기능

- 노션 표(키 / 기능)를 읽어 `docs/data/shortcuts.json` 으로 저장
- 3D 키보드(풀사이즈 / 텐키리스)에 선택한 단축키의 키캡을 분류 색으로 표시
- 분류는 노션 색상과 동일 (연한 톤)
  - 초록: 파일, 폴더 / 빨강: 열기 / 파랑: 실행 관련 / 갈색: 코드 작업 / 분홍: 그 외 (색 없는 행 포함)
- 사이드바: 토글로 열고 닫기, 닫힌 상태에서는 분류 아이콘만 표시, 분류별 단축키 목록
- 키 필터 칩: Ctrl, Alt, Shift, Ctrl + Alt (하나만 선택)
- 메뉴 또는 키보드의 키캡을 눌러 단축키 선택 (같은 키를 다시 누르면 그 키를 쓰는 다음 단축키)
- 기본 선택은 Hot Reload (`Ctrl + \`)

## 구조

```
docs/                 배포되는 정적 사이트 (GitHub Pages)
  index.html, style.css, app.js
  data/shortcuts.json 단축키 데이터
scripts/sync-notion.js  노션 -> JSON 동기화
server.js             로컬 미리보기 서버
```

`docs/data/shortcuts.json` 한 항목:

```json
{
  "id": "ctrl+\\",
  "name": "Hot Reload(화면 재랜더링)",
  "description": "앱 상태는 유지한 채 ...",
  "keys": ["Ctrl", "\\"],
  "category": "blue"
}
```

`category` 는 노션 색상 이름이며 분류와 색 판별에 함께 쓰입니다.

## 실행

Node.js 20 이상이 필요합니다.

```powershell
npm start
```

http://localhost:3000 에서 확인합니다.

## 노션 동기화

1. 노션에서 [내 통합](https://www.notion.so/profile/integrations)을 만들고 토큰을 발급합니다.
2. 단축키 페이지의 `···` → 연결에서 해당 통합을 추가합니다.
3. 프로젝트 루트에 `.env` 를 만듭니다. (`.gitignore` 로 커밋되지 않습니다.)

   ```
   NOTION_KEY=발급받은_토큰
   ```

4. 동기화합니다.

   ```powershell
   npm run sync
   ```

   다른 페이지를 쓰려면 URL 또는 ID를 넘깁니다: `npm run sync -- <노션 URL>`

### 설명(description) 규칙

- 이미 설명이 있는 단축키는 덮어쓰지 않습니다.
- 노션에 새로 생긴 단축키만 `description` 이 빈 값으로 추가됩니다. 이 항목만 AI 채팅으로 설명을 채웁니다.
- 노션에서 사라진 단축키는 JSON에서도 제거됩니다.

## 배포 (GitHub Pages)

1. 저장소 Settings → Pages
2. Source: `Deploy from a branch`, Branch: `main`, 폴더: `/docs`
3. 노션 내용이 바뀌면 `npm run sync` 후 커밋·푸시합니다. 사이트는 노션을 직접 읽지 않고 JSON만 읽습니다.

`NOTION_KEY` 는 `.env` 에만 있고 `docs/` 에는 들어가지 않으므로 배포해도 노출되지 않습니다.
