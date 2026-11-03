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
  <view id="page-617" class="page-1">
    <view class="frame-1">
      <view class="frame-2">
        <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtMTUgMTgtNi02IDYtNiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
      <view class="frame-3">
        <text class="text-1">回声</text>
        <text class="text-2">回声乐队 · 深夜电台</text>
      </view>
      <view class="frame-4">
        <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTEgMTJhMSAxIDAgMSAwIDIgMGExIDEgMCAxIDAgLTIgME0xOCAxMmExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwTTQgMTJhMSAxIDAgMSAwIDIgMGExIDEgMCAxIDAgLTIgMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
    </view>
    <view class="frame-5">
      <text class="text-3">我站在风里听见</text>
      <text class="text-4">远处传来的回响</text>
      <text class="text-5">像是你留下的话</text>
      <text class="text-6">一遍一遍在耳边</text>
      <text class="text-7">穿过漫长的夜</text>
      <view class="frame-6">
        <text class="text-8">如果回声也有方向</text>
        <text class="text-9">我想它会奔向你身旁</text>
      </view>
      <text class="text-10">那些没说完的梦</text>
      <text class="text-11">都藏进这一段旋律</text>
      <text class="text-12">我在原地等一盏灯</text>
      <text class="text-13">照亮你回来的路</text>
      <text class="text-14">回声啊 别走太远</text>
      <text class="text-15">让我再听一遍</text>
    </view>
    <view class="frame-7">
      <view class="frame-8">
        <text class="text-16">下一句：那些没说完的梦</text>
      </view>
      <view class="frame-9">
        <view class="frame-10">
          <view class="frame-11"></view>
          <view class="oval-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0ib3ZhbC0xIiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSIjZmZmZmZmIiBmaWxsLXJ1bGU9Im5vbnplcm8iPjxwYXRoIGQ9Ik0gMTIgNiBDIDEyIDkuMzEgOS4zMSAxMiA2IDEyIEMgMi42OSAxMiAwIDkuMzEgMCA2IEMgMCAyLjY5IDIuNjkgMCA2IDAgQyA5LjMxIDAgMTIgMi42OSAxMiA2IFoiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-12">
          <text class="text-17">01:42</text>
          <text class="text-18">03:58</text>
        </view>
      </view>
      <view class="frame-13">
        <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNzE3MTdhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Im0xOCAxNCA0IDQtNCA0bTE4IDIgNCA0LTQgNE0yIDE4aDEuOTczYTQgNCAwIDAgMCAzLjMtMS43bDUuNDU0LTguNmE0IDQgMCAwIDEgMy4zLTEuN0gyMk0yIDZoMS45NzJhNCA0IDAgMCAxIDMuNiAyLjJNMjIgMThoLTYuMDQxYTQgNCAwIDAgMS0zLjMtMS44bC0uMzU5LS40NSIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <view class="frame-14">
          <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiID48cGF0aCBkPSJNMTkgMjBMOSAxMkwxOSA0TDE5IDIwWk01IDE5TDUgNSIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-15">
          <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiID48cGF0aCBkPSJNNiAzTDIwIDEyTDYgMjFMNiAzWiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-16">
          <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiID48cGF0aCBkPSJNNSA0TDE1IDEyTDUgMjBMNSA0Wk0xOSA1TDE5IDE5IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="vector-7" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNzE3MTdhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Im0xNyAyIDQgNC00IDRNMyAxMXYtMWE0IDQgMCAwIDEgNC00aDE0bTcgMjItNC00IDQtNE0yMSAxM3YxYTQgNCAwIDAgMS00IDRIMyIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
    </view>
    <view class="frame-17">
      <view class="frame-18" @tap="go('/pages/p-1/index')">
        <view class="vector-8" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTgiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNzE3MTdhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0zIDExYTggOCAwIDEgMCAxNiAwYTggOCAwIDEgMCAtMTYgMG0yMSAyMS00LjMtNC4zIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-19">发现</text>
      </view>
      <view class="frame-19" @tap="go('/pages/p-2/index')">
        <view class="vector-9" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTkiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNzE3MTdhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik02IDNMMjAgMTJMNiAyMUw2IDNaIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-20">播放</text>
      </view>
      <view class="frame-20">
        <view class="vector-10" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzVlNmFkMiIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNMTUgMkg2YTIgMiAwIDAgMC0yIDJ2MTZhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjdaTTE0IDJ2NGEyIDIgMCAwIDAgMiAyaDRNMTAgOUg4TTE2IDEzSDhNMTYgMTdIOCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-21">歌词</text>
      </view>
      <view class="frame-21" @tap="go('/pages/p-3/index')">
        <view class="vector-11" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTExIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzcxNzE3YSIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNMyAxMmguMDFNMyAxOGguMDFNMyA2aC4wMU04IDEyaDEzTTggMThoMTNNOCA2aDEzIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-22">歌单详情</text>
      </view>
      <view class="frame-22" @tap="go('/pages/p-5/index')">
        <view class="vector-12" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEyIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzcxNzE3YSIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNMTkgMjF2LTJhNCA0IDAgMCAwLTQtNEg5YTQgNCAwIDAgMC00IDR2Mk04IDdhNCA0IDAgMSAwIDggMGE0IDQgMCAxIDAgLTggMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-23">我的音乐</text>
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
  padding: 0px 0px 88px 0px;
  width: 100%;
  min-height: max(812px, 100vh);
  background-color: #0a0a0b;
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
  height: 56px;
  border: 1px solid rgba(255,255,255,0.10);
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
  background-color: rgba(255,255,255,0.03);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.10);
}

.vector-1 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-1 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: rgba(255,255,255,0.03);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.10);
}

.vector-2 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 32px 24px 16px 24px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-3 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 100px;
  opacity: 0.42;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-4 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 100px;
  opacity: 0.46;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-5 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 100px;
  opacity: 0.5;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-6 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 100px;
  opacity: 0.55;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-7 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 86px;
  opacity: 0.62;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-8 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 162px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 29px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.4px;
  color: #5e6ad2;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-9 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 128px;
  opacity: 0.85;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #8b8ff0;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-10 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 100px;
  opacity: 0.62;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-11 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 114px;
  opacity: 0.55;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-12 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 114px;
  opacity: 0.5;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-13 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 100px;
  opacity: 0.46;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-14 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 108px;
  opacity: 0.42;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-15 {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-width: 86px;
  opacity: 0.38;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.1px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-7 {
  box-sizing: border-box;
  position: fixed;
  display: flex;
  flex-direction: column;
  bottom: calc(0px + env(safe-area-inset-bottom, 0px));
  gap: 12px;
  padding: 14px 20px 20px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #0a0a0b;
  border: 1px solid rgba(255,255,255,0.10);
  backdrop-filter: blur(12px);
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
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
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-height: 4px;
  background-color: rgba(255,255,255,0.10);
  border-radius: 999px;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  width: 148px;
  height: 4px;
  background-image: linear-gradient(180deg, #5e6ad2 0%, #8b5cf6 100%);
  border-radius: 999px;
}

.oval-1 {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  position: absolute;
  left: 140px;
  top: -4px;
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
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-3 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.vector-4 {
  box-sizing: border-box;
  width: 24px;
  height: 24px;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background-image: linear-gradient(225deg, #5e6ad2 0%, #8b5cf6 100%);
  border-radius: 999px;
}

.vector-5 {
  box-sizing: border-box;
  width: 24px;
  height: 24px;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.vector-6 {
  box-sizing: border-box;
  width: 24px;
  height: 24px;
}

.vector-7 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.frame-17 {
  box-sizing: border-box;
  position: fixed;
  display: flex;
  flex-direction: row;
  bottom: calc(0px + env(safe-area-inset-bottom, 0px));
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-height: 64px;
  background-color: #0a0a0b;
  border: 1px solid rgba(255,255,255,0.10);
}

.frame-18 {
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

.vector-8 {
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
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
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
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-9 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-20 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
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
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-10 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
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
  color: #5e6ad2;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-21 {
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

.vector-11 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
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
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-22 {
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

.vector-12 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-23 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
