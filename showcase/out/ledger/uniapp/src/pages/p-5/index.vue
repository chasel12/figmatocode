<script setup>
// 平级导航（底栏互链）走 reLaunch：小程序页面栈上限 10 层，
// navigateTo 连点底栏会把栈堆满，之后所有跳转静默失败
const go = (url) => {
  uni.navigateTo({ url })
}
const switchTo = (url) => {
  uni.reLaunch({ url })
}
</script>

<template>
  <view id="page-372" class="page-1">
    <view class="frame-1">
      <text class="text-1">统计</text>
      <view class="frame-2">
        <text class="text-2">本周</text>
        <text class="text-3">本月</text>
        <text class="text-4">本年</text>
      </view>
    </view>
    <view class="frame-3">
      <text class="text-5">分类占比</text>
      <view class="frame-4">
        <view class="frame-5">
          <view class="frame-6">
            <text class="text-6">餐饮</text>
            <view class="frame-7">
              <text class="text-7">¥1,286.50</text>
              <text class="text-8">30%</text>
            </view>
          </view>
          <view class="frame-8">
            <view class="rectangle-1"></view>
          </view>
        </view>
        <view class="frame-9">
          <view class="frame-10">
            <text class="text-9">购物</text>
            <view class="frame-11">
              <text class="text-10">¥940.00</text>
              <text class="text-11">22%</text>
            </view>
          </view>
          <view class="frame-12">
            <view class="rectangle-2"></view>
          </view>
        </view>
        <view class="frame-13">
          <view class="frame-14">
            <text class="text-12">居家</text>
            <view class="frame-15">
              <text class="text-13">¥468.00</text>
              <text class="text-14">11%</text>
            </view>
          </view>
          <view class="frame-16">
            <view class="rectangle-3"></view>
          </view>
        </view>
        <view class="frame-17">
          <view class="frame-18">
            <text class="text-15">娱乐</text>
            <view class="frame-19">
              <text class="text-16">¥520.00</text>
              <text class="text-17">12%</text>
            </view>
          </view>
          <view class="frame-20">
            <view class="rectangle-4"></view>
          </view>
        </view>
        <view class="frame-21">
          <view class="frame-22">
            <text class="text-18">交通</text>
            <view class="frame-23">
              <text class="text-19">¥386.00</text>
              <text class="text-20">9%</text>
            </view>
          </view>
          <view class="frame-24">
            <view class="rectangle-5"></view>
          </view>
        </view>
        <view class="frame-25">
          <view class="frame-26">
            <text class="text-21">学习</text>
            <view class="frame-27">
              <text class="text-22">¥1,180.00</text>
              <text class="text-23">16%</text>
            </view>
          </view>
          <view class="frame-28">
            <view class="rectangle-6"></view>
          </view>
        </view>
      </view>
    </view>
    <view class="frame-29">
      <text class="text-24">本月支出趋势</text>
      <view class="frame-30">
        <view class="frame-31">
          <text class="text-25">最高的一天 11-25</text>
          <text class="text-26">¥1,180.00</text>
        </view>
        <view class="rectangle-7"></view>
        <view class="frame-32">
          <text class="text-27">日均</text>
          <text class="text-28">¥153.09</text>
        </view>
      </view>
    </view>
    <view class="frame-33" @tap="switchTo('/pages/p-2/index')">
      <text class="text-29">查看明细</text>
    </view>
  </view>
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
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border: 1px solid #e4e8e6;
}

.text-1 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 24px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.3px;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
  padding: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #f8fafc;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.text-2 {
  box-sizing: border-box;
  padding: 4px 8px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  border-radius: 4px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-3 {
  box-sizing: border-box;
  padding: 4px 8px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #0f5132;
  border-radius: 4px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-4 {
  box-sizing: border-box;
  padding: 4px 8px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  border-radius: 4px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 16px 0px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 600;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.4px;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 4px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-6 {
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
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-8 {
  box-sizing: border-box;
  width: 36px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  text-align: right;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #f1f5f9;
  border-radius: 999px;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 200px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 999px;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
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
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-9 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-11 {
  box-sizing: border-box;
  width: 36px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  text-align: right;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-12 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #f1f5f9;
  border-radius: 999px;
}

.rectangle-2 {
  box-sizing: border-box;
  width: 200px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 999px;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-14 {
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
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-13 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-14 {
  box-sizing: border-box;
  width: 36px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  text-align: right;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #f1f5f9;
  border-radius: 999px;
}

.rectangle-3 {
  box-sizing: border-box;
  width: 200px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 999px;
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
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

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-16 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-17 {
  box-sizing: border-box;
  width: 36px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  text-align: right;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-20 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #f1f5f9;
  border-radius: 999px;
}

.rectangle-4 {
  box-sizing: border-box;
  width: 200px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 999px;
}

.frame-21 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-22 {
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
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-23 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-19 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-20 {
  box-sizing: border-box;
  width: 36px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  text-align: right;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #f1f5f9;
  border-radius: 999px;
}

.rectangle-5 {
  box-sizing: border-box;
  width: 200px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 999px;
}

.frame-25 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-26 {
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

.text-21 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-27 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-22 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-23 {
  box-sizing: border-box;
  width: 36px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  text-align: right;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-28 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 6px;
  background-color: #f1f5f9;
  border-radius: 999px;
}

.rectangle-6 {
  box-sizing: border-box;
  width: 200px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 999px;
}

.frame-29 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 16px 0px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-24 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 600;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.4px;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.frame-30 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 4px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.frame-31 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-25 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-26 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-7 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #e2e8f0;
}

.frame-32 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-27 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-28 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-33 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 16px 16px 8px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-29 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #0f5132;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
