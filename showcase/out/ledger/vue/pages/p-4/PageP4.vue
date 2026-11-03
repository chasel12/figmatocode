<template>
  <main id="page-507" class="page-1">
    <div class="frame-1">
      <div class="frame-2">
        <svg class="vector-1" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fill-rule="nonzero" stroke="#1c2024" stroke-width="2.4" ><path d="m15 18-6-6 6-6" /></svg>
      </div>
      <span class="text-1">{{ "预算" }}</span>
      <div class="frame-3">
        <span class="text-2">{{ "11 月" }}</span>
      </div>
    </div>
    <div class="frame-4">
      <div class="frame-5">
        <span class="text-3">{{ "TOTAL BUDGET" }}</span>
        <div class="frame-6">
          <span class="text-4">{{ "71%" }}</span>
          <span class="text-5">{{ "已用 ¥4,286.50 / 总预算 ¥6,000.00" }}</span>
        </div>
        <div class="frame-7">
          <div class="rectangle-1"></div>
        </div>
        <div class="frame-8">
          <span class="text-6">{{ "本月剩余可用" }}</span>
          <span class="text-7">{{ "¥1,713.50" }}</span>
        </div>
      </div>
    </div>
    <div class="frame-9">
      <div class="frame-10">
        <span class="text-8">{{ "分类预算" }}</span>
        <span class="text-9">{{ "6 项" }}</span>
      </div>
      <div class="frame-11">
        <div class="frame-12">
          <span class="text-10">{{ "餐饮" }}</span>
          <span class="text-11">{{ "¥1,286.50 / ¥1,500.00" }}</span>
        </div>
        <div class="frame-13">
          <div class="rectangle-2"></div>
        </div>
      </div>
      <div class="frame-14">
        <div class="frame-15">
          <span class="text-12">{{ "交通" }}</span>
          <span class="text-13">{{ "¥386.00 / ¥500.00" }}</span>
        </div>
        <div class="frame-16">
          <div class="rectangle-3"></div>
        </div>
      </div>
      <div class="frame-17">
        <div class="frame-18">
          <span class="text-14">{{ "购物" }}</span>
          <span class="text-15">{{ "¥940.00 / ¥1,200.00" }}</span>
        </div>
        <div class="frame-19">
          <div class="rectangle-4"></div>
        </div>
      </div>
      <div class="frame-20">
        <div class="frame-21">
          <span class="text-16">{{ "娱乐" }}</span>
          <span class="text-17">{{ "¥520.00 / ¥600.00" }}</span>
        </div>
        <div class="frame-22">
          <div class="rectangle-5"></div>
        </div>
      </div>
      <div class="frame-23">
        <div class="frame-24">
          <span class="text-18">{{ "居家" }}</span>
          <span class="text-19">{{ "¥468.00 / ¥800.00" }}</span>
        </div>
        <div class="frame-25">
          <div class="rectangle-6"></div>
        </div>
      </div>
      <div class="frame-26">
        <div class="frame-27">
          <span class="text-20">{{ "学习" }}</span>
          <div class="frame-28">
            <span class="text-21">{{ "已超支" }}</span>
          </div>
        </div>
        <span class="text-22">{{ "¥1,180.00 / ¥1,000.00" }}</span>
        <div class="frame-29">
          <div class="rectangle-7"></div>
        </div>
      </div>
    </div>
    <div class="frame-30">
      <button class="button-1" type="button">{{ "调整预算" }}</button>
      <button class="button-2" type="button">{{ "查看预算明细" }}</button>
    </div>
  </main>
</template>

<style>
.page-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0px 0px 24px 0px;
  width: 100%;
  min-height: max(812px, 100vh);
  background-color: #ffffff;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.frame-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 48px;
  background-color: #ffffff;
  border: 1px solid #e4e8e6;
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #ffffff;
  border-radius: 4px;
}

.vector-1 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-1 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
  padding: 2px 8px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #60646c;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 4px;
  border: 1px solid #e4e8e6;
  box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.06), 0px 4px 12px 0px rgba(0,0,0,0.08);
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.2px;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: flex-end;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 30px;
  font-weight: 700;
  line-height: 32px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -1px;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-5 {
  box-sizing: border-box;
  padding: 0px 0px 4px 0px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 8px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 240px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 4px;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-8 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-9 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 4px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  border: 1px solid #e4e8e6;
}

.frame-12 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-11 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.rectangle-2 {
  box-sizing: border-box;
  width: 160px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 4px;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 4px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  border: 1px solid #e4e8e6;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-12 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-13 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.rectangle-3 {
  box-sizing: border-box;
  width: 160px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 4px;
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 4px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  border: 1px solid #e4e8e6;
}

.frame-18 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-14 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.rectangle-4 {
  box-sizing: border-box;
  width: 160px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 4px;
}

.frame-20 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 4px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  border: 1px solid #e4e8e6;
}

.frame-21 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-16 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-17 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-22 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.rectangle-5 {
  box-sizing: border-box;
  width: 160px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 4px;
}

.frame-23 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 4px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  border: 1px solid #e4e8e6;
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-19 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-25 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.rectangle-6 {
  box-sizing: border-box;
  width: 160px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 4px;
}

.frame-26 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 4px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  border: 1px solid #e4e8e6;
}

.frame-27 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-20 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-28 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  padding: 2px 6px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #fef2f2;
  border-radius: 4px;
}

.text-21 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e5484d;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-22 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e5484d;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-29 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #fef2f2;
  border-radius: 4px;
}

.rectangle-7 {
  box-sizing: border-box;
  width: 300px;
  height: 100%;
  background-color: #e5484d;
  border-radius: 4px;
}

.frame-30 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 12px 0px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.button-1 {
  box-sizing: border-box;
  padding: 10px 12px;
  width: 100%;
  height: 40px;
  min-width: 78px;
  background-color: #ffffff;
  border-radius: 4px;
  border: 1px solid #e4e8e6;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
  appearance: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-2 {
  box-sizing: border-box;
  padding: 10px 12px;
  width: 100%;
  height: 40px;
  min-width: 104px;
  background-color: #0f5132;
  border-radius: 4px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
  appearance: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-1:hover {
  background-color: #f4f6f5;
}

.button-2:hover {
  opacity: 0.92;
}

.button-2:active {
  opacity: 0.82;
}
</style>
