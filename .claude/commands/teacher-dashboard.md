---
description: 선생님 모드 전체 기능(데이터 수집·비교·리포트·등급·내보내기)을 한 화면에서 안내하고 실행하는 대시보드 명령어
argument-hint: [csv 경로] [내보내기 형식: csv|pdf|none]
allowed-tools: Read, Write, Bash
---

선생님 모드의 진입점(entry point) 역할을 하는 대시보드 명령어다. 개별 단계만 다시 실행하고 싶으면 아래 명령어를 따로 사용해도 된다.

| 명령어 | 역할 |
|---|---|
| `/quiz-teacher-collect` | `results/students.csv` 형식 검증·요약 |
| `/quiz-teacher-compare` | 학생별 비교표·순위 |
| `/quiz-teacher-report` | 카테고리·난이도별 학급 분석, 취약점·개선 제안 |
| `/quiz-teacher` | 위 세 가지를 한 번에 실행하는 통합 명령어 |
| `/create-report` | 백분위 기준 상대평가(A/B/C/D) 등급 보고서 생성 + `results/teacher_report.html` 저장 |
| `/export-report` | `results/teacher_report.html`을 CSV 또는 PDF로 내보내기 |
| `/teacher-dashboard` (이 명령어) | 위 전체를 순서대로 실행하는 대시보드 |

대상 경로 및 내보내기 형식: $ARGUMENTS

- 첫 번째 값이 있으면 CSV 경로로 사용하고, 없으면 기본값 `results/students.csv`를 사용한다.
- 두 번째 값이 있으면 내보내기 형식(`csv`/`pdf`/`none`)으로 사용하고, 없으면 기본값 `none`(내보내기 생략)을 사용한다. `csv`/`pdf`/`none` 외의 값이면 사용 가능한 값을 안내하고 중단한다.

### 1단계 — 데이터 수집·검증 (`/quiz-teacher-collect`와 동일한 규칙)

- 파일이 없으면 템플릿을 생성하고 데이터 형식을 안내한 뒤 여기서 종료한다.
- 무효 행은 목록으로 보여주고 제외한다. 유효 행이 하나도 없으면 사유를 안내하고 종료한다.

### 2단계 — 성적 비교 (`/quiz-teacher-compare`의 `best` 기준과 동일한 규칙)

- 학생별 최고 정답률 기록으로 비교표(순위, 이름, 카테고리, 난이도, 점수, 정답률, 응시 횟수)와 학급 평균·최고·최저를 계산한다.

### 3단계 — 상세 리포트 (`/quiz-teacher-report`와 동일한 규칙)

- 카테고리별·난이도별 학급 평균 정답률, 학생별 취약 카테고리, 개선 제안을 정리한다.

### 4단계 — 상대평가 등급 산정 (`/create-report`의 `best` 기준과 동일한 규칙)

- 백분위 기준으로 A(상위 20%)/B(상위 40%까지)/C(상위 70%까지)/D(하위 30%) 등급을 배정한다.
- 결과를 `results/teacher_report.html`로 저장한다 (이미 있으면 덮어쓴다).

### 5단계 — 내보내기 (`/export-report`와 동일한 규칙)

- 내보내기 형식이 `csv`면 `results/teacher_report.csv`로, `pdf`면 브라우저 인쇄 기능을 통해 PDF로 저장을 시도한다 (`/export-report`의 3번 항목과 동일하게, 자동화가 불가능하면 수동 안내로 대체한다).
- 형식이 `none`이면 이 단계는 건너뛰고 4단계에서 만든 HTML 경로만 다시 안내한다.

### 6단계 — 종합 보고

다음을 정리해서 보고한다: 1~5단계 각 단계의 실행 여부(✅/⏭ 건너뜀/❌ 중단), 학생 수·유효 행 수, 학급 평균 정답률, 등급별 분포, 생성/갱신된 파일 목록(`results/teacher_report.html`, 내보낸 경우 `results/teacher_report.csv` 또는 PDF 경로).

파일을 수정하지 않는다 — 단, 1단계에서 `students.csv` 템플릿을 새로 만드는 경우와 4~5단계에서 `teacher_report.html`/내보내기 파일을 생성·갱신하는 경우는 예외다.
