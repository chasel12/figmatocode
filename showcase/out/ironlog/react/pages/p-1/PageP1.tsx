import './page.css'

export function PageP1() {
  return (
    <main id="page-1" className="page-1">
      <div className="frame-1">
        <span className="text-1">{"铁志"}</span>
      </div>
      <div className="rectangle-1"></div>
      <div className="frame-2">
        <span className="text-2">{"MON · 第 6 周"}</span>
        <span className="text-3">{"今日"}</span>
      </div>
      <div className="frame-3">
        <div className="frame-4">
          <span className="text-4">{"本周完成"}</span>
          <div className="frame-5">
            <span className="text-5">{"3 / 4"}</span>
            <span className="text-6">{"次"}</span>
          </div>
        </div>
        <div className="rectangle-2"></div>
        <div className="frame-6">
          <span className="text-7">{"累计容量"}</span>
          <div className="frame-7">
            <span className="text-8">{"12.4"}</span>
            <span className="text-9">{"吨"}</span>
          </div>
        </div>
      </div>
      <div className="frame-8">
        <span className="text-10">{"今日计划"}</span>
        <div className="frame-9">
          <div className="frame-10">
            <span className="text-11">{"杠铃深蹲"}</span>
            <span className="text-12">{"5×5"}</span>
            <span className="text-13">{"100kg"}</span>
          </div>
          <div className="frame-11">
            <span className="text-14">{"罗马尼亚硬拉"}</span>
            <span className="text-15">{"4×8"}</span>
            <span className="text-16">{"80kg"}</span>
          </div>
          <div className="frame-12">
            <span className="text-17">{"腿举"}</span>
            <span className="text-18">{"3×12"}</span>
            <span className="text-19">{"160kg"}</span>
          </div>
          <div className="frame-13">
            <span className="text-20">{"站姿提踵"}</span>
            <span className="text-21">{"3×15"}</span>
            <span className="text-22">{"60kg"}</span>
          </div>
          <div className="rectangle-3"></div>
        </div>
      </div>
      <div className="frame-14">
        <button className="button-1" type="button">{"开始训练"}</button>
      </div>
      <div className="frame-15">
        <div className="frame-16">
          <span className="text-23">{"今日"}</span>
          <div className="rectangle-4"></div>
        </div>
        <div className="frame-17" onClick={() => { window.location.href = "../p-3/index.html" }}>
          <span className="text-24">{"动作库"}</span>
        </div>
        <div className="frame-18" onClick={() => { window.location.href = "../p-6/index.html" }}>
          <span className="text-25">{"我的"}</span>
        </div>
      </div>
    </main>
  )
}

export default PageP1
