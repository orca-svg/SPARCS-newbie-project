export default function DashboardPage() {
  return (
    <div className="dashboard-content">
      {/* 중앙: 캘린더 자리 */}
      <section className="dashboard-calendar">
        <div className="panel-title">Calendar</div>
        <div className="calendar-box">일정 목록 로드중,,</div>
      </section>

      {/* 오른쪽: 공지 / 프로젝트 / 채팅 박스 */}
      <aside className="dashboard-right">
        <div className="right-card">
          <div className="panel-title">전체 공지</div>
          <div className="card-body">최근 공지 목록 들어갈 자리</div>
        </div>

        <div className="right-card">
          <div className="panel-title">프로젝트</div>
          <div className="card-body">프로젝트 카드 자리</div>
        </div>

        <div className="right-card">
          <div className="panel-title">인기 게시판</div>
          <div className="card-body">주요 글 자리</div>
        </div>
      </aside>
    </div>
  );
}
