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
  <view id="page-229" class="page-1">
    <view class="frame-1">
      <text class="text-1">记一笔</text>
      <view class="frame-2">
        <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjA2NDZjIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTggNiA2IDE4bTYgNiAxMiAxMiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
    </view>
    <view class="frame-3">
      <view class="frame-4">
        <text class="text-2">¥</text>
        <text class="text-3">1286.50</text>
      </view>
      <view class="rectangle-1"></view>
    </view>
    <view class="frame-5">
      <view class="frame-6">
        <text class="text-4">支出</text>
      </view>
      <view class="frame-7">
        <text class="text-5">收入</text>
      </view>
    </view>
    <view class="frame-8">
      <view class="frame-9">
        <view class="frame-10">
          <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0zIDJ2N2MwIDEuMS45IDIgMiAyaDRhMiAyIDAgMCAwIDItMlYyTTcgMnYyME0yMSAxNVYyYTUgNSAwIDAgMC01IDV2NmMwIDEuMS45IDIgMiAyaDNabTAgMHY3IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <text class="text-6">餐饮</text>
      </view>
      <view class="frame-11">
        <view class="frame-12">
          <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjA2NDZjIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik04IDZ2Nk0xNSA2djZNMiAxMmgxOS42TTE4IDE4aDNzLjUtMS43LjgtMi44Yy4xLS40LjItLjguMi0xLjIgMC0uNC0uMS0uOC0uMi0xLjJsLTEuNC01QzIwLjEgNi44IDE5LjEgNiAxOCA2SDRhMiAyIDAgMCAwLTIgMnYxMGgzTTUgMThhMiAyIDAgMSAwIDQgMGEyIDIgMCAxIDAgLTQgME05IDE4aDVNMTQgMThhMiAyIDAgMSAwIDQgMGEyIDIgMCAxIDAgLTQgMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <text class="text-7">交通</text>
      </view>
      <view class="frame-13">
        <view class="frame-14">
          <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjA2NDZjIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik02IDIgMyA2djE0YTIgMiAwIDAgMCAyIDJoMTRhMiAyIDAgMCAwIDItMlY2bC0zLTRaTTMgNmgxOE0xNiAxMGE0IDQgMCAwIDEtOCAwIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <text class="text-8">购物</text>
      </view>
      <view class="frame-15">
        <view class="frame-16">
          <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjA2NDZjIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0xNSAyMXYtOGExIDEgMCAwIDAtMS0xaC00YTEgMSAwIDAgMC0xIDF2OE0zIDEwYTIgMiAwIDAgMSAuNzA5LTEuNTI4bDctNS45OTlhMiAyIDAgMCAxIDIuNTgyIDBsNyA1Ljk5OUEyIDIgMCAwIDEgMjEgMTB2OWEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnoiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <text class="text-9">居家</text>
      </view>
      <view class="frame-17">
        <view class="frame-18">
          <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjA2NDZjIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik02IDExTDEwIDExTTggOUw4IDEzTTE1IDEyTDE1LjAxIDEyTTE4IDEwTDE4LjAxIDEwTTE3LjMyIDVINi42OGE0IDQgMCAwIDAtMy45NzggMy41OWMtLjAwNi4wNTItLjAxLjEwMS0uMDE3LjE1MkMyLjYwNCA5LjQxNiAyIDE0LjQ1NiAyIDE2YTMgMyAwIDAgMCAzIDNjMSAwIDEuNS0uNSAyLTFsMS40MTQtMS40MTRBMiAyIDAgMCAxIDkuODI4IDE2aDQuMzQ0YTIgMiAwIDAgMSAxLjQxNC41ODZMMTcgMThjLjUuNSAxIDEgMiAxYTMgMyAwIDAgMCAzLTNjMC0xLjU0NS0uNjA0LTYuNTg0LS42ODUtNy4yNTgtLjAwNy0uMDUtLjAxMS0uMS0uMDE3LS4xNTFBNCA0IDAgMCAwIDE3LjMyIDV6IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <text class="text-10">娱乐</text>
      </view>
      <view class="frame-19">
        <view class="frame-20">
          <view class="vector-7" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjA2NDZjIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Im0xMC41IDIwLjUgMTAtMTBhNC45NSA0Ljk1IDAgMSAwLTctN2wtMTAgMTBhNC45NSA0Ljk1IDAgMSAwIDcgN1ptOC41IDguNSA3IDciIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <text class="text-11">医疗</text>
      </view>
      <view class="frame-21">
        <view class="frame-22">
          <view class="vector-8" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTgiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjA2NDZjIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0xMiA3djE0TTMgMThhMSAxIDAgMCAxLTEtMVY0YTEgMSAwIDAgMSAxLTFoNWE0IDQgMCAwIDEgNCA0IDQgNCAwIDAgMSA0LTRoNWExIDEgMCAwIDEgMSAxdjEzYTEgMSAwIDAgMS0xIDFoLTZhMyAzIDAgMCAwLTMgMyAzIDMgMCAwIDAtMy0zeiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <text class="text-12">学习</text>
      </view>
      <view class="frame-23">
        <view class="frame-24">
          <view class="vector-9" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTkiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjA2NDZjIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik00IDhoMTZhMSAxIDAgMCAxIDEgMXYyYTEgMSAwIDAgMSAtMSAxaC0xNmExIDEgMCAwIDEgLTEgLTF2LTJhMSAxIDAgMCAxIDEgLTFaTTEyIDh2MTNNMTkgMTJ2N2EyIDIgMCAwIDEtMiAySDdhMiAyIDAgMCAxLTItMnYtN003LjUgOGEyLjUgMi41IDAgMCAxIDAtNUE0LjggOCAwIDAgMSAxMiA4YTQuOCA4IDAgMCAxIDQuNS01IDIuNSAyLjUgMCAwIDEgMCA1IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <text class="text-13">人情</text>
      </view>
      <view class="frame-25">
        <view class="frame-26">
          <view class="vector-10" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzYwNjQ2YyIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNMTEgMTJhMSAxIDAgMSAwIDIgMGExIDEgMCAxIDAgLTIgME0xOCAxMmExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwTTQgMTJhMSAxIDAgMSAwIDIgMGExIDEgMCAxIDAgLTIgMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <text class="text-14">其他</text>
      </view>
    </view>
    <view class="frame-27">
      <view class="frame-28">
        <text class="text-15">楼下面馆</text>
      </view>
      <view class="frame-29">
        <view class="frame-30">
          <view class="vector-11" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzYwNjQ2YyIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0iTTggMnY0TTE2IDJ2NE01IDRoMTRhMiAyIDAgMCAxIDIgMnYxNGEyIDIgMCAwIDEgLTIgMmgtMTRhMiAyIDAgMCAxIC0yIC0ydi0xNGEyIDIgMCAwIDEgMiAtMlpNMyAxMGgxOCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-16">11 月 28 日</text>
          <text class="text-17">今天</text>
        </view>
        <view class="vector-12" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEyIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0ibTkgMTggNi02LTYtNiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
    </view>
    <view class="frame-31" @tap="go('/pages/p-2/index')">
      <view class="button-1">保存</view>
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
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 48px;
  background-color: #ffffff;
  border: 1px solid #e4e8e6;
}

.text-1 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 17px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-2 {
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
  gap: 8px;
  padding: 24px 16px 16px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 20px;
  font-weight: 500;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 40px;
  font-weight: 700;
  line-height: 44px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -1px;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #e2e8f0;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  padding: 0px 16px 20px 16px;
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
  justify-content: center;
  padding: 0px 16px;
  width: fit-content;
  height: 32px;
  flex: 0 0 auto;
  background-color: #0f5132;
  border-radius: 9999px;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
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
  justify-content: center;
  padding: 0px 16px;
  width: fit-content;
  height: 32px;
  flex: 0 0 auto;
  background-color: #f4f6f5;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #60646c;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 8px;
  padding: 0px 16px 20px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: fit-content;
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
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: #0f5132;
  border-radius: 9999px;
}

.vector-2 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: fit-content;
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
  width: 48px;
  height: 48px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-3 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #60646c;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: fit-content;
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
  width: 48px;
  height: 48px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-4 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-8 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #60646c;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: fit-content;
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
  width: 48px;
  height: 48px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-5 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-9 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #60646c;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: fit-content;
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
  width: 48px;
  height: 48px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-6 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #60646c;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: fit-content;
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
  width: 48px;
  height: 48px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-7 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-11 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #60646c;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-21 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: fit-content;
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
  width: 48px;
  height: 48px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-8 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-12 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #60646c;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-23 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-9 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-13 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #60646c;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-25 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: fit-content;
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
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-10 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-14 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #60646c;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-27 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-28 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  padding: 0px 12px;
  width: 100%;
  height: 40px;
  background-color: #FFFFFF;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  box-shadow: inset 0px 1px 2px 0px rgba(0,0,0,0.06);
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #94a3b8;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-29 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 12px;
  width: 100%;
  height: 40px;
  background-color: #f8fafc;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.frame-30 {
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

.vector-11 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-16 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
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
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-12 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-31 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px 16px 0px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.button-1 {
  box-sizing: border-box;
  padding: 10px 12px;
  width: 100%;
  height: 44px;
  min-width: 56px;
  background-color: #0f5132;
  border-radius: 4px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 15px;
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
  opacity: 0.92;
}

.button-1:active {
  opacity: 0.82;
}
</style>
