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
  <view id="page-271" class="page-1">
    <view class="frame-1">
      <text class="text-1">PROFILE</text>
      <text class="text-2">我的</text>
    </view>
    <view class="rectangle-1"></view>
    <view class="frame-2">
      <view class="oval-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0ib3ZhbC0xIiB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSIjRTJFMERCIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzExMTExMSIgc3Ryb2tlLXdpZHRoPSIxIiA+PHBhdGggZD0iTSA2NCAzMiBDIDY0IDQ5LjY3IDQ5LjY3IDY0IDMyIDY0IEMgMTQuMzMgNjQgMCA0OS42NyAwIDMyIEMgMCAxNC4zMyAxNC4zMyAwIDMyIDAgQyA0OS42NyAwIDY0IDE0LjMzIDY0IDMyIFoiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
      <view class="frame-3">
        <text class="text-3">陈默</text>
        <text class="text-4">训练第 3 年</text>
      </view>
    </view>
    <view class="rectangle-2"></view>
    <view class="frame-4">
      <view class="frame-5">
        <view class="frame-6">
          <text class="text-5">186</text>
          <text class="text-6">次</text>
        </view>
        <text class="text-7">训练次数</text>
      </view>
      <view class="frame-7">
        <view class="frame-8">
          <text class="text-8">12</text>
          <text class="text-9">周</text>
        </view>
        <text class="text-10">连续周期</text>
      </view>
      <view class="frame-9">
        <view class="frame-10">
          <text class="text-11">1240</text>
          <text class="text-12">吨</text>
        </view>
        <text class="text-13">累计负荷</text>
      </view>
    </view>
    <view class="rectangle-3"></view>
    <view class="frame-11">
      <view class="frame-12">
        <text class="text-14">训练记录</text>
        <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjQTNBM0EzIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
      <view class="frame-13">
        <text class="text-15">进度曲线</text>
        <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjQTNBM0EzIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
      <view class="frame-14">
        <text class="text-16">单位设置</text>
        <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjQTNBM0EzIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
      <view class="frame-15">
        <text class="text-17">导出数据</text>
        <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjQTNBM0EzIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
      <view class="frame-16">
        <text class="text-18">关于铁志</text>
        <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjQTNBM0EzIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
    </view>
    <view class="rectangle-4"></view>
    <view class="frame-17">
      <view class="frame-18" @tap="switchTo('/pages/p-1/index')">
        <text class="text-19">今日</text>
      </view>
      <view class="frame-19" @tap="switchTo('/pages/p-3/index')">
        <text class="text-20">动作库</text>
      </view>
      <view class="frame-20">
        <text class="text-21">我的</text>
        <view class="rectangle-5"></view>
      </view>
    </view>
  </view>
</template>

<style>
.page-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0px 0px 64px 0px;
  width: 100%;
  min-height: max(812px, 100vh);
  background-color: #F7F6F3;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.frame-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 40px 20px 20px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-1 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.2px;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 37px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.7px;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #E2E0DB;
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: center;
  padding: 28px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.oval-1 {
  box-sizing: border-box;
  width: 64px;
  height: 64px;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  min-width: 0;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.8px;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-2 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #E2E0DB;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 28px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: flex-end;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 37px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.7px;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.8px;
  color: #6B6B6B;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: flex-end;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-8 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 37px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.7px;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-9 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.8px;
  color: #6B6B6B;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: flex-end;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-11 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 37px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.7px;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-12 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-13 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.8px;
  color: #6B6B6B;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-3 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #E2E0DB;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-12 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 60px;
  border: 1px solid #E2E0DB;
}

.text-14 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-1 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 60px;
  border: 1px solid #E2E0DB;
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-2 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 60px;
  border: 1px solid #E2E0DB;
}

.text-16 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-3 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 60px;
  border: 1px solid #E2E0DB;
}

.text-17 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-4 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 60px;
  border: 1px solid #E2E0DB;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-5 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.rectangle-4 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #E2E0DB;
}

.frame-17 {
  box-sizing: border-box;
  position: fixed;
  display: flex;
  flex-direction: row;
  bottom: calc(0px + env(safe-area-inset-bottom, 0px));
  align-items: center;
  justify-content: space-between;
  padding: 0px 24px;
  width: 100%;
  height: 64px;
  background-color: #F7F6F3;
  border: 1px solid #E2E0DB;
}

.frame-18 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: transparent;
}

.text-19 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #9A9A9A;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: transparent;
}

.text-20 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #9A9A9A;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-20 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: transparent;
}

.text-21 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-5 {
  box-sizing: border-box;
  width: 20px;
  height: 2px;
  background-color: #111111;
}
</style>
