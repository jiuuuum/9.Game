---
description: results/teacher_report.html을 읽어 CSV 또는 PDF로 저장 (선생님 모드 - 보고서 내보내기)
argument-hint: <csv|pdf> [html 경로]
allowed-tools: Read, Write, Bash
---

`results/teacher_report.html`(`/create-report`가 생성한 등급 보고서)을 읽어 CSV 또는 PDF 파일로 내보낸다.

대상 형식 및 경로: $ARGUMENTS

- 첫 번째 값(`$1`)은 필수이며 `csv` 또는 `pdf`여야 한다. 비어 있거나 그 외 값이면 사용법(`/export-report <csv|pdf> [html 경로]`)을 안내하고 중단한다.
- 두 번째 값(`$2`)이 있으면 HTML 파일 경로로 사용하고, 없으면 기본값 `results/teacher_report.html`을 사용한다.
- 지정된 경로에 HTML 파일이 없으면 "`teacher_report.html`이 없습니다. 먼저 `/create-report`(또는 `/teacher-dashboard`)로 보고서를 생성하세요"라고 안내하고 중단한다.

1. HTML 파일을 읽어 보고서 표(순위, 이름, 카테고리, 난이도, 점수, 정답률, 백분위, 등급)와 등급별 분포 요약을 파악한다. 표 구조를 알아볼 수 없으면(예: `/create-report`가 만든 형식이 아님) 사유를 안내하고 중단한다.

2. **`csv`인 경우**
   - 표의 각 행을 `순위,이름,카테고리,난이도,점수,정답률,백분위,등급` 컬럼의 CSV로 변환한다.
   - `results/teacher_report.csv`로 저장한다. 이미 파일이 있으면 덮어쓴다는 점을 사용자에게 안내한다.
   - 저장 경로와 변환된 행 수를 보고한다.

3. **`pdf`인 경우**
   - 이 프로젝트는 빌드 도구·외부 라이브러리가 없는 순수 정적 사이트이므로, PDF는 브라우저의 인쇄 기능을 통해서만 생성할 수 있다.
   - Chrome 브라우저 자동화 도구(`mcp__claude-in-chrome__*`)를 사용할 수 있으면: `results/teacher_report.html`을 새 탭에서 열고 인쇄(PDF로 저장)를 진행한다. 단, OS 네이티브 인쇄 대화상자는 자동화 도구가 직접 조작할 수 없는 영역이므로, 대화상자가 뜨면 사용자에게 "파일 이름/저장 위치를 확인하고 저장을 눌러 완료해 달라"고 안내한다.
   - 브라우저 자동화 도구를 사용할 수 없거나 위 과정이 실패하면: 자동 PDF 생성이 불가능함을 안내하고, 대신 `results/teacher_report.html`을 직접 브라우저로 열어 `Ctrl+P` → "PDF로 저장"을 이용하는 방법을 안내한 뒤 중단한다.

4. 원본 `results/teacher_report.html`은 수정하지 않는다.
