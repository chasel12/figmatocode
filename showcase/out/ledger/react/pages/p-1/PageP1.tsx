import './page.css'

export function PageP1() {
  return (
    <main id="page-1" className="page-1">
      <div className="frame-1">
        <div className="frame-2">
          <span className="text-1">{"11 月"}</span>
          <svg className="vector-1" width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#64748b" strokeWidth="4" ><path d="m6 9 6 6 6-6" /></svg>
        </div>
        <span className="text-2">{"青柠账本"}</span>
      </div>
      <div className="frame-3">
        <span className="text-3">{"本月支出"}</span>
        <span className="text-4">{"¥4,286.50"}</span>
        <div className="frame-4"></div>
        <div className="frame-5">
          <div className="frame-6">
            <span className="text-5">{"收入"}</span>
            <span className="text-6">{"¥12,800.00"}</span>
          </div>
          <div className="frame-7">
            <span className="text-7">{"结余"}</span>
            <span className="text-8">{"¥8,513.50"}</span>
          </div>
        </div>
      </div>
      <div className="frame-8">
        <div className="frame-9">
          <span className="text-9">{"本月预算"}</span>
          <span className="text-10">{"71%"}</span>
        </div>
        <span className="text-11">{"已用 ¥4,286.50 / 总额 ¥6,000.00"}</span>
        <div className="frame-10">
          <div className="rectangle-1"></div>
        </div>
        <div className="frame-11">
          <div className="rectangle-2"></div>
        </div>
      </div>
      <div className="frame-12">
        <div className="frame-13" onClick={() => { window.location.href = "../p-2/index.html" }}>
          <span className="text-12">{"最近三笔"}</span>
          <span className="text-13">{"全部明细"}</span>
        </div>
        <div className="frame-14">
          <div className="frame-15">
            <svg className="vector-2" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="3" ><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg>
          </div>
          <div className="frame-16">
            <span className="text-14">{"餐饮"}</span>
            <span className="text-15">{"楼下面馆"}</span>
          </div>
          <div className="frame-17">
            <span className="text-16">{"¥38.00"}</span>
            <span className="text-17">{"11-28"}</span>
          </div>
        </div>
        <div className="frame-18">
          <div className="frame-19">
            <svg className="vector-3" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="3" ><path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3M5 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M9 18h5M14 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /></svg>
          </div>
          <div className="frame-20">
            <span className="text-18">{"交通"}</span>
            <span className="text-19">{"地铁2号线"}</span>
          </div>
          <div className="frame-21">
            <span className="text-20">{"¥6.00"}</span>
            <span className="text-21">{"11-28"}</span>
          </div>
        </div>
        <div className="frame-22">
          <div className="frame-23">
            <svg className="vector-4" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="3" ><path d="M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1M6 2v2" /></svg>
          </div>
          <div className="frame-24">
            <span className="text-22">{"购物"}</span>
            <span className="text-23">{"咖啡续命"}</span>
          </div>
          <div className="frame-25">
            <span className="text-24">{"¥28.00"}</span>
            <span className="text-25">{"11-27"}</span>
          </div>
        </div>
        <div className="frame-26">
          <div className="frame-27">
            <svg className="vector-5" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="3" ><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zM12 22V12m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7m7.5 4.27 9 5.15" /></svg>
          </div>
          <div className="frame-28">
            <span className="text-26">{"居家"}</span>
            <span className="text-27">{"宜家收纳盒"}</span>
          </div>
          <div className="frame-29">
            <span className="text-28">{"¥129.00"}</span>
            <span className="text-29">{"11-26"}</span>
          </div>
        </div>
        <div className="frame-30">
          <div className="frame-31">
            <svg className="vector-6" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="3" ><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2ZM13 5v2M13 17v2M13 11v2" /></svg>
          </div>
          <div className="frame-32">
            <span className="text-30">{"娱乐"}</span>
            <span className="text-31">{"电影票两张"}</span>
          </div>
          <div className="frame-33">
            <span className="text-32">{"¥76.00"}</span>
            <span className="text-33">{"11-26"}</span>
          </div>
        </div>
      </div>
      <div className="frame-34" onClick={() => { window.location.href = "../p-3/index.html" }}>
        <button className="button-1" type="button">{"记一笔"}</button>
      </div>
      <div className="frame-35">
        <div className="frame-36">
          <svg className="vector-7" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="2.4" ><path d="M4 3h5a1 1 0 0 1 1 1v7a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1ZM15 3h5a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1ZM15 12h5a1 1 0 0 1 1 1v7a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1ZM4 16h5a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1Z" /></svg>
          <span className="text-34">{"概览"}</span>
        </div>
        <div className="frame-37" onClick={() => { window.location.href = "../p-2/index.html" }}>
          <svg className="vector-8" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#64748b" strokeWidth="2.4" ><path d="M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13" /></svg>
          <span className="text-35">{"明细"}</span>
        </div>
        <div className="frame-38" onClick={() => { window.location.href = "../p-6/index.html" }}>
          <svg className="vector-9" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#64748b" strokeWidth="2.4" ><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M8 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /></svg>
          <span className="text-36">{"我的"}</span>
        </div>
      </div>
    </main>
  )
}

export default PageP1
