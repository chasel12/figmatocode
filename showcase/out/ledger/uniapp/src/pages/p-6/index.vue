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
  <view id="page-442" class="page-1">
    <view class="frame-1">
      <view class="frame-2">
        <view class="frame-3">
          <text class="text-1">柠</text>
        </view>
        <view class="frame-4">
          <text class="text-2">柠檬不加冰</text>
          <text class="text-3">已记账 186 天</text>
        </view>
        <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNmI3YTcyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
      <view class="rectangle-1"></view>
      <view class="frame-5">
        <view class="frame-6">
          <text class="text-4">3</text>
          <text class="text-5">账本数量</text>
        </view>
        <view class="rectangle-2"></view>
        <view class="frame-7">
          <text class="text-6">186</text>
          <text class="text-7">记账天数</text>
        </view>
        <view class="rectangle-3"></view>
        <view class="frame-8">
          <text class="text-8">12</text>
          <text class="text-9">连续记账</text>
        </view>
      </view>
    </view>
    <view class="frame-9">
      <text class="text-10">SETTINGS</text>
      <view class="frame-10">
        <view class="frame-11">
          <view class="frame-12">
            <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNNSAzaDE0YTIgMiAwIDAgMSAyIDJ2MTRhMiAyIDAgMCAxIC0yIDJoLTE0YTIgMiAwIDAgMSAtMiAtMnYtMTRhMiAyIDAgMCAxIDIgLTJaTTMgOWgxOE0zIDE1aDE4TTkgM3YxOE0xNSAzdjE4IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <text class="text-11">分类管理</text>
          <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNmI3YTcyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-13">
          <view class="frame-14">
            <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMjEgMTJjLjU1MiAwIDEuMDA1LS40NDkuOTUtLjk5OGExMCAxMCAwIDAgMC04Ljk1My04Ljk1MWMtLjU1LS4wNTUtLjk5OC4zOTgtLjk5OC45NXY4YTEgMSAwIDAgMCAxIDF6TTIxLjIxIDE1Ljg5QTEwIDEwIDAgMSAxIDggMi44MyIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <text class="text-12">预算设置</text>
          <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNmI3YTcyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-15">
          <view class="frame-16">
            <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMjEgMTV2NGEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnYtNE03IDEwTDEyIDE1TDE3IDEwTTEyIDE1TDEyIDMiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <text class="text-13">数据导出</text>
          <view class="vector-7" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNmI3YTcyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-17">
          <view class="frame-18">
            <view class="vector-8" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTgiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTAuMjY4IDIxYTIgMiAwIDAgMCAzLjQ2NCAwTTMuMjYyIDE1LjMyNkExIDEgMCAwIDAgNCAxN2gxNmExIDEgMCAwIDAgLjc0LTEuNjczQzE5LjQxIDEzLjk1NiAxOCAxMi40OTkgMTggOEE2IDYgMCAwIDAgNiA4YzAgNC40OTktMS40MTEgNS45NTYtMi43MzggNy4zMjYiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <text class="text-14">账单提醒</text>
          <view class="vector-9" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTkiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNmI3YTcyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-19">
          <view class="frame-20">
            <view class="vector-10" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEwIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzBmNTEzMiIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0iTTggMTJhNCA0IDAgMSAwIDggMGE0IDQgMCAxIDAgLTggME0xMiAydjJNMTIgMjB2Mm00LjkzIDQuOTMgMS40MSAxLjQxbTE3LjY2IDE3LjY2IDEuNDEgMS40MU0yIDEyaDJNMjAgMTJoMm02LjM0IDE3LjY2LTEuNDEgMS40MW0xOS4wNyA0LjkzLTEuNDEgMS40MSIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <text class="text-15">主题</text>
          <view class="vector-11" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzZiN2E3MiIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0ibTkgMTggNi02LTYtNiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-21">
          <view class="frame-22">
            <view class="vector-12" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEyIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzBmNTEzMiIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0iTTIgMTJhMTAgMTAgMCAxIDAgMjAgMGExMCAxMCAwIDEgMCAtMjAgME05LjA5IDlhMyAzIDAgMCAxIDUuODMgMWMwIDItMyAzLTMgM00xMiAxN2guMDEiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <text class="text-16">关于</text>
          <view class="vector-13" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEzIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzZiN2E3MiIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0ibTkgMTggNi02LTYtNiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
      </view>
    </view>
    <view class="frame-23">
      <view class="frame-24" @tap="switchTo('/pages/p-1/index')">
        <view class="vector-14" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE0IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzZiN2E3MiIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNNCAzaDVhMSAxIDAgMCAxIDEgMXY3YTEgMSAwIDAgMSAtMSAxaC01YTEgMSAwIDAgMSAtMSAtMXYtN2ExIDEgMCAwIDEgMSAtMVpNMTUgM2g1YTEgMSAwIDAgMSAxIDF2M2ExIDEgMCAwIDEgLTEgMWgtNWExIDEgMCAwIDEgLTEgLTF2LTNhMSAxIDAgMCAxIDEgLTFaTTE1IDEyaDVhMSAxIDAgMCAxIDEgMXY3YTEgMSAwIDAgMSAtMSAxaC01YTEgMSAwIDAgMSAtMSAtMXYtN2ExIDEgMCAwIDEgMSAtMVpNNCAxNmg1YTEgMSAwIDAgMSAxIDF2M2ExIDEgMCAwIDEgLTEgMWgtNWExIDEgMCAwIDEgLTEgLTF2LTNhMSAxIDAgMCAxIDEgLTFaIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-17">概览</text>
      </view>
      <view class="frame-25" @tap="switchTo('/pages/p-2/index')">
        <view class="vector-15" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE1IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzZiN2E3MiIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNMyAxMmguMDFNMyAxOGguMDFNMyA2aC4wMU04IDEyaDEzTTggMThoMTNNOCA2aDEzIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-18">明细</text>
      </view>
      <view class="frame-26">
        <view class="vector-16" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzBmNTEzMiIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNMTkgMjF2LTJhNCA0IDAgMCAwLTQtNEg5YTQgNCAwIDAgMC00IDR2Mk04IDdhNCA0IDAgMSAwIDggMGE0IDQgMCAxIDAgLTggMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-19">我的</text>
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
  padding: 0px 0px 72px 0px;
  width: 100%;
  min-height: max(812px, 100vh);
  background-color: #ffffff;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.frame-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 16px 16px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border: 1px solid #e4e8e6;
  box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.04);
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background-color: #0f5132;
  border-radius: 9999px;
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
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 18px;
  font-weight: 600;
  line-height: 23px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-1 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #e4e8e6;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 29px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-2 {
  box-sizing: border-box;
  width: 1px;
  height: 28px;
  background-color: #e4e8e6;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 29px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
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
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-3 {
  box-sizing: border-box;
  width: 1px;
  height: 28px;
  background-color: #e4e8e6;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.text-8 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 29px;
  -webkit-font-smoothing: antialiased;
  color: #0f5132;
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
  letter-spacing: 0.2px;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 0px 16px;
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
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.8px;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 4px;
  border: 1px solid #e4e8e6;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
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
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.vector-2 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-11 {
  box-sizing: border-box;
  min-width: 58px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-3 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
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
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.vector-4 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-12 {
  box-sizing: border-box;
  min-width: 58px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-5 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.vector-6 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-13 {
  box-sizing: border-box;
  min-width: 58px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-7 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
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
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.vector-8 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-14 {
  box-sizing: border-box;
  min-width: 58px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-9 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-20 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.vector-10 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-15 {
  box-sizing: border-box;
  min-width: 30px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-11 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-21 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
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
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: #f4f6f5;
  border-radius: 4px;
}

.vector-12 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-16 {
  box-sizing: border-box;
  min-width: 30px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-13 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-23 {
  box-sizing: border-box;
  position: fixed;
  display: flex;
  flex-direction: row;
  bottom: calc(0px + env(safe-area-inset-bottom, 0px));
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 28px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-height: 64px;
  background-color: #ffffff;
  border: 1px solid #e4e8e6;
  box-shadow: 0px -1px 2px 0px rgba(0,0,0,0.04);
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-14 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-17 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 12px;
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
  gap: 4px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-15 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 12px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-26 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-16 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-19 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 600;
  line-height: 12px;
  -webkit-font-smoothing: antialiased;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
