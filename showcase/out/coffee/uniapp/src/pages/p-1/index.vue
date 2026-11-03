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
  <view id="page-1" class="page-1">
    <view class="frame-1">
      <view class="frame-2">
        <view class="frame-3">
          <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMjAgMTBjMCA0Ljk5My01LjUzOSAxMC4xOTMtNy4zOTkgMTEuNzk5YTEgMSAwIDAgMS0xLjIwMiAwQzkuNTM5IDIwLjE5MyA0IDE0Ljk5MyA0IDEwYTggOCAwIDAgMSAxNiAwTTkgMTBhMyAzIDAgMSAwIDYgMGEzIDMgMCAxIDAgLTYgMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-1">望京 SOHO 店</text>
          <text class="text-2">320m</text>
        </view>
        <view class="frame-4">
          <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtNiA5IDYgNiA2LTYiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
      </view>
      <view class="frame-5">
        <text class="text-3">下午好</text>
        <text class="text-4">今天想喝点什么？手冲豆子新鲜到店</text>
      </view>
      <view class="frame-6">
        <view class="frame-7">
          <text class="text-5">推荐</text>
        </view>
        <view class="frame-8">
          <text class="text-6">美式</text>
        </view>
        <view class="frame-9">
          <text class="text-7">拿铁</text>
        </view>
        <view class="frame-10">
          <text class="text-8">特调</text>
        </view>
        <view class="frame-11">
          <text class="text-9">甜点</text>
        </view>
      </view>
    </view>
    <view class="frame-12">
      <view class="frame-13">
        <view class="frame-14">
          <view class="frame-15">
            <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjEuNSIgPjxwYXRoIGQ9Ik0xMCAydjJNMTQgMnYyTTE2IDhhMSAxIDAgMCAxIDEgMXY4YTQgNCAwIDAgMS00IDRIN2E0IDQgMCAwIDEtNC00VjlhMSAxIDAgMCAxIDEtMWgxNGE0IDQgMCAxIDEgMCA4aC0xTTYgMnYyIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <view class="frame-16">
            <text class="text-10">燕麦拿铁</text>
            <text class="text-11">Oat Latte</text>
          </view>
          <view class="frame-17">
            <text class="text-12">¥32.00</text>
            <text class="text-13">查看详情</text>
          </view>
        </view>
        <view class="frame-18">
          <view class="frame-19">
            <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjEuNSIgPjxwYXRoIGQ9Im02IDggMS43NSAxMi4yOGEyIDIgMCAwIDAgMiAxLjcyaDQuNTRhMiAyIDAgMCAwIDItMS43MkwxOCA4TTUgOGgxNE03IDE1YTYuNDcgNi40NyAwIDAgMSA1IDAgNi40NyA2LjQ3IDAgMCAwIDUgMG0xMiA4IDEtNmgyIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <view class="frame-20">
            <text class="text-14">海盐焦糖玛奇朵</text>
            <text class="text-15">Sea Salt Caramel Macchiato</text>
          </view>
          <view class="frame-21">
            <text class="text-16">¥36.00</text>
            <text class="text-17">查看详情</text>
          </view>
        </view>
        <view class="frame-22">
          <view class="frame-23">
            <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjEuNSIgPjxwYXRoIGQ9Ik0yMS42NiAxNy42N2ExLjA4IDEuMDggMCAwIDEtLjA0IDEuNkExMiAxMiAwIDAgMSA0LjczIDIuMzhhMS4xIDEuMSAwIDAgMSAxLjYxLS4wNHpNMTkuNjUgMTUuNjZBOCA4IDAgMCAxIDguMzUgNC4zNG0xNCAxMC01LjUgNS41TTE0IDE3Ljg1VjEwSDYuMTUiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <view class="frame-24">
            <text class="text-18">冰摇柠檬美式</text>
            <text class="text-19">Iced Lemon Americano</text>
          </view>
          <view class="frame-25">
            <text class="text-20">¥28.00</text>
            <text class="text-21">查看详情</text>
          </view>
        </view>
        <view class="frame-26">
          <view class="frame-27">
            <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjEuNSIgPjxwYXRoIGQ9Ik0yMCAyMXYtOGEyIDIgMCAwIDAtMi0ySDZhMiAyIDAgMCAwLTIgMnY4TTQgMTZzLjUtMSAyLTEgMi41IDIgNCAyIDIuNS0yIDQtMiAyLjUgMiA0IDIgMi0xIDItMU0yIDIxaDIwTTcgOHYzTTEyIDh2M00xNyA4djNNNyA0aC4wMU0xMiA0aC4wMU0xNyA0aC4wMSIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <view class="frame-28">
            <text class="text-22">巴斯克芝士蛋糕</text>
            <text class="text-23">Basque Cheesecake</text>
          </view>
          <view class="frame-29">
            <text class="text-24">¥26.00</text>
            <text class="text-25">查看详情</text>
          </view>
        </view>
      </view>
    </view>
    <view class="frame-30">
      <view class="vector-7" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmFmNWVmIiBzdHJva2Utd2lkdGg9IjIiID48cGF0aCBkPSJNNiAyIDMgNnYxNGEyIDIgMCAwIDAgMiAyaDE0YTIgMiAwIDAgMCAyLTJWNmwtMy00Wk0zIDZoMThNMTYgMTBhNCA0IDAgMCAxLTggMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
      <view class="frame-31">
        <text class="text-26">2</text>
      </view>
    </view>
    <view class="frame-32">
      <view class="frame-33">
        <view class="vector-8" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTgiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0xMCAydjJNMTQgMnYyTTE2IDhhMSAxIDAgMCAxIDEgMXY4YTQgNCAwIDAgMS00IDRIN2E0IDQgMCAwIDEtNC00VjlhMSAxIDAgMCAxIDEtMWgxNGE0IDQgMCAxIDEgMCA4aC0xTTYgMnYyIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-27">点单</text>
      </view>
      <view class="frame-34" @tap="switchTo('/pages/p-5/index')">
        <view class="vector-9" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTkiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjlhMzkwIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik00IDJ2MjBsMi0xIDIgMSAyLTEgMiAxIDItMSAyIDEgMi0xIDIgMVYybC0yIDEtMi0xLTIgMS0yLTEtMiAxLTItMS0yIDFaTTE2IDhoLTZhMiAyIDAgMSAwIDAgNGg0YTIgMiAwIDEgMSAwIDRIOE0xMiAxNy41di0xMSIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-28">订单</text>
      </view>
      <view class="frame-35" @tap="switchTo('/pages/p-6/index')">
        <view class="vector-10" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2I5YTM5MCIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNMTkgMjF2LTJhNCA0IDAgMCAwLTQtNEg5YTQgNCAwIDAgMC00IDR2Mk04IDdhNCA0IDAgMSAwIDggMGE0IDQgMCAxIDAgLTggMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-29">我的</text>
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
  background-color: #faf5ef;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.frame-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #faf5ef;
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
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
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-1 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-1 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
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
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #d4a373;
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
  width: 36px;
  height: 36px;
  background-color: #f1e7db;
  border-radius: 9999px;
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
  gap: 6px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 32px;
  font-weight: 700;
  line-height: 37px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.6px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #d4a373;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-6 {
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

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 0px 16px;
  width: fit-content;
  height: 36px;
  flex: 0 0 auto;
  background-color: #b5654a;
  border-radius: 9999px;
  box-shadow: 0px 4px 12px 0px rgba(181,101,74,0.28);
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #faf5ef;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 0px 16px;
  width: fit-content;
  height: 36px;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 9999px;
  border: 1px solid #e6d5c1;
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 0px 16px;
  width: fit-content;
  height: 36px;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 9999px;
  border: 1px solid #e6d5c1;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 0px 16px;
  width: fit-content;
  height: 36px;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 9999px;
  border: 1px solid #e6d5c1;
}

.text-8 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
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
  justify-content: center;
  padding: 0px 16px;
  width: fit-content;
  height: 36px;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 9999px;
  border: 1px solid #e6d5c1;
}

.text-9 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-12 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 20px 24px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 10px 12px 10px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #f0e3d3;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.08);
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 104px;
  background-color: #f0dcc7;
  border-radius: 8px;
}

.vector-3 {
  box-sizing: border-box;
  width: 32px;
  height: 32px;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  font-size: 14px;
  font-weight: 600;
  line-height: 19px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-11 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 15px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #b9a390;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
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
  font-size: 15px;
  font-weight: 700;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
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
  letter-spacing: 0.2px;
  color: #8b9d77;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-18 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 10px 12px 10px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #f0e3d3;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.08);
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 104px;
  background-color: #f0dcc7;
  border-radius: 8px;
}

.vector-4 {
  box-sizing: border-box;
  width: 32px;
  height: 32px;
}

.frame-20 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  font-size: 14px;
  font-weight: 600;
  line-height: 19px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 15px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #b9a390;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-21 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
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
  font-size: 15px;
  font-weight: 700;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-17 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #8b9d77;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-22 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 10px 12px 10px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #f0e3d3;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.08);
}

.frame-23 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 104px;
  background-color: #f0dcc7;
  border-radius: 8px;
}

.vector-5 {
  box-sizing: border-box;
  width: 32px;
  height: 32px;
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  font-size: 14px;
  font-weight: 600;
  line-height: 19px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-19 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 15px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #b9a390;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-25 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
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
  font-size: 15px;
  font-weight: 700;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-21 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #8b9d77;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-26 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 10px 12px 10px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #f0e3d3;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.08);
}

.frame-27 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 104px;
  background-color: #f0dcc7;
  border-radius: 8px;
}

.vector-6 {
  box-sizing: border-box;
  width: 32px;
  height: 32px;
}

.frame-28 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-22 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 19px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-23 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 15px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #b9a390;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-29 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
  justify-content: space-between;
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
  font-size: 15px;
  font-weight: 700;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-25 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #8b9d77;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-30 {
  box-sizing: border-box;
  position: absolute;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  left: 295px;
  top: 640px;
  background-color: #b5654a;
  border-radius: 999px;
  box-shadow: 0px 8px 20px -4px rgba(181,101,74,0.45);
}

.vector-7 {
  box-sizing: border-box;
  width: 24px;
  height: 24px;
}

.frame-31 {
  box-sizing: border-box;
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  left: 34px;
  top: -4px;
  background-color: #8b9d77;
  border-radius: 999px;
  border: 2px solid #faf5ef;
}

.text-26 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 700;
  line-height: 11px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-32 {
  box-sizing: border-box;
  position: fixed;
  display: flex;
  flex-direction: row;
  bottom: calc(0px + env(safe-area-inset-bottom, 0px));
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 48px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-height: 72px;
  background-color: #ffffff;
  border: 1px solid #f0e3d3;
  box-shadow: 0px -4px 16px 0px rgba(122,99,80,0.08);
}

.frame-33 {
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

.text-27 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-34 {
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

.text-28 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 500;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  color: #b9a390;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-35 {
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

.text-29 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 500;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  color: #b9a390;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
