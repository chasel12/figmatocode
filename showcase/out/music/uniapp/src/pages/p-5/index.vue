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
  <view id="page-464" class="page-1">
    <view class="frame-1">
      <view class="frame-2">
        <view class="frame-3">
          <text class="text-1">LIBRARY</text>
          <text class="text-2">我的音乐</text>
        </view>
        <view class="frame-4">
          <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNNiAzTDIwIDEyTDYgMjFMNiAzWiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
      </view>
      <text class="text-3">最近播放 · 128 首 · 共 7 小时 42 分</text>
    </view>
    <view class="rectangle-1"></view>
    <view class="frame-5">
      <view class="frame-6">
        <text class="text-4">最近播放</text>
        <text class="text-5">全部</text>
      </view>
      <view class="frame-7">
        <view class="frame-8">
          <text class="text-6">1</text>
        </view>
        <view class="image-1 ui-image-placeholder ui-image-ph-hero-146"></view>
        <view class="frame-9">
          <text class="text-7">Ocean Eyes</text>
          <text class="text-8">Billie Eilish</text>
        </view>
        <text class="text-9">3:20</text>
      </view>
      <view class="frame-10">
        <view class="frame-11">
          <text class="text-10">2</text>
        </view>
        <view class="image-2 ui-image-placeholder ui-image-ph-hero-146"></view>
        <view class="frame-12">
          <text class="text-11">夜空中最亮的星</text>
          <text class="text-12">逃跑计划</text>
        </view>
        <text class="text-13">4:12</text>
      </view>
      <view class="frame-13">
        <view class="frame-14">
          <text class="text-14">3</text>
        </view>
        <view class="image-3 ui-image-placeholder ui-image-ph-hero-146"></view>
        <view class="frame-15">
          <text class="text-15">Weightless</text>
          <text class="text-16">Marconi Union</text>
        </view>
        <text class="text-17">8:07</text>
      </view>
      <view class="frame-16">
        <view class="frame-17">
          <text class="text-18">4</text>
        </view>
        <view class="image-4 ui-image-placeholder ui-image-ph-hero-146"></view>
        <view class="frame-18">
          <text class="text-19">Hotel California</text>
          <text class="text-20">Eagles</text>
        </view>
        <text class="text-21">6:30</text>
      </view>
      <view class="frame-19">
        <view class="frame-20">
          <text class="text-22">5</text>
        </view>
        <view class="image-5 ui-image-placeholder ui-image-ph-hero-146"></view>
        <view class="frame-21">
          <text class="text-23">Vienna</text>
          <text class="text-24">Billy Joel</text>
        </view>
        <text class="text-25">3:34</text>
      </view>
      <view class="frame-22">
        <view class="frame-23">
          <text class="text-26">6</text>
        </view>
        <view class="image-6 ui-image-placeholder ui-image-ph-hero-146"></view>
        <view class="frame-24">
          <text class="text-27">晴天</text>
          <text class="text-28">周杰伦</text>
        </view>
        <text class="text-29">4:29</text>
      </view>
    </view>
    <view class="rectangle-2"></view>
    <view class="frame-25">
      <view class="frame-26">
        <text class="text-30">我收藏的歌单</text>
        <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNzE3MTdhIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
      <view class="frame-27">
        <view class="frame-28">
          <view class="image-7 ui-image-placeholder ui-image-ph-hero-353"></view>
          <view class="frame-29">
            <view class="frame-30">
              <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNWU2YWQyIiBzdHJva2Utd2lkdGg9IjQiID48cGF0aCBkPSJNMyAxNGgzYTIgMiAwIDAgMSAyIDJ2M2EyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnYtN2E5IDkgMCAwIDEgMTggMHY3YTIgMiAwIDAgMS0yIDJoLTFhMiAyIDAgMCAxLTItMnYtM2EyIDIgMCAwIDEgMi0yaDMiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <text class="text-31">深夜房间 · 合成器</text>
          </view>
          <text class="text-32">42 首</text>
        </view>
        <view class="frame-31">
          <view class="image-8 ui-image-placeholder ui-image-ph-hero-353"></view>
          <view class="frame-32">
            <view class="frame-33">
              <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNWU2YWQyIiBzdHJva2Utd2lkdGg9IjQiID48cGF0aCBkPSJNMyAxNGgzYTIgMiAwIDAgMSAyIDJ2M2EyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnYtN2E5IDkgMCAwIDEgMTggMHY3YTIgMiAwIDAgMS0yIDJoLTFhMiAyIDAgMCAxLTItMnYtM2EyIDIgMCAwIDEgMi0yaDMiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <text class="text-33">公路旅行 2024</text>
          </view>
          <text class="text-34">67 首</text>
        </view>
        <view class="frame-34">
          <view class="image-9 ui-image-placeholder ui-image-ph-hero-353"></view>
          <view class="frame-35">
            <view class="frame-36">
              <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNWU2YWQyIiBzdHJva2Utd2lkdGg9IjQiID48cGF0aCBkPSJNMyAxNGgzYTIgMiAwIDAgMSAyIDJ2M2EyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnYtN2E5IDkgMCAwIDEgMTggMHY3YTIgMiAwIDAgMS0yIDJoLTFhMiAyIDAgMCAxLTItMnYtM2EyIDIgMCAwIDEgMi0yaDMiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <text class="text-35">Lo-Fi 写代码</text>
          </view>
          <text class="text-36">120 首</text>
        </view>
        <view class="frame-37">
          <view class="image-10 ui-image-placeholder ui-image-ph-hero-353"></view>
          <view class="frame-38">
            <view class="frame-39">
              <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNWU2YWQyIiBzdHJva2Utd2lkdGg9IjQiID48cGF0aCBkPSJNMyAxNGgzYTIgMiAwIDAgMSAyIDJ2M2EyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnYtN2E5IDkgMCAwIDEgMTggMHY3YTIgMiAwIDAgMS0yIDJoLTFhMiAyIDAgMCAxLTItMnYtM2EyIDIgMCAwIDEgMi0yaDMiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <text class="text-37">华语金曲回忆</text>
          </view>
          <text class="text-38">88 首</text>
        </view>
      </view>
    </view>
    <view class="frame-40">
      <view class="frame-41">
        <view class="frame-42">
          <view class="vector-7" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNWU2YWQyIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0yMSAxNXY0YTIgMiAwIDAgMS0yIDJINWEyIDIgMCAwIDEtMi0ydi00TTcgMTBMMTIgMTVMMTcgMTBNMTIgMTVMMTIgMyIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-43">
          <text class="text-39">本地音乐</text>
          <text class="text-40">36 首 · 占用 412 MB</text>
        </view>
        <view class="vector-8" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTgiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNzE3MTdhIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
    </view>
    <view class="frame-44">
      <view class="frame-45" @tap="switchTo('/pages/p-1/index')">
        <view class="vector-9" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTkiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNzE3MTdhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0xNSAyMXYtOGExIDEgMCAwIDAtMS0xaC00YTEgMSAwIDAgMC0xIDF2OE0zIDEwYTIgMiAwIDAgMSAuNzA5LTEuNTI4bDctNS45OTlhMiAyIDAgMCAxIDIuNTgyIDBsNyA1Ljk5OUEyIDIgMCAwIDEgMjEgMTB2OWEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnoiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-41">发现</text>
      </view>
      <view class="frame-46" @tap="switchTo('/pages/p-4/index')">
        <view class="vector-10" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzcxNzE3YSIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNMyAxMWE4IDggMCAxIDAgMTYgMGE4IDggMCAxIDAgLTE2IDBtMjEgMjEtNC4zLTQuMyIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-42">搜索</text>
      </view>
      <view class="frame-47">
        <view class="vector-11" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTExIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzVlNmFkMiIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNOSAxOFY1bDEyLTJ2MTNNMyAxOGEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwTTE1IDE2YTMgMyAwIDEgMCA2IDBhMyAzIDAgMSAwIC02IDAiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-43">我的音乐</text>
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
  padding: 0px 0px 80px 0px;
  width: 100%;
  min-height: max(812px, 100vh);
  background-color: #0a0a0b;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.frame-1 {
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

.frame-2 {
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

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.8px;
  color: #71717a;
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
  font-size: 24px;
  font-weight: 600;
  line-height: 29px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.4px;
  color: #ffffff;
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
  width: 40px;
  height: 40px;
  background-image: linear-gradient(180deg, #5e6ad2 0%, #8b5cf6 100%);
  border-radius: 8px;
}

.vector-1 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  margin: 12px 0px 0px 0px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: rgba(255,255,255,0.10);
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 16px 8px 16px;
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
  margin: 0px 0px 4px 0px;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 21px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #ffffff;
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
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 10px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 24px;
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
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
}

.image-1 {
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.frame-9 {
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

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-8 {
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
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 10px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 24px;
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
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
}

.image-2 {
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.frame-12 {
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

.text-11 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-12 {
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
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 10px 0px;
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
  width: 24px;
  height: fit-content;
  flex: 0 0 auto;
}

.text-14 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
}

.image-3 {
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.frame-15 {
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

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
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
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 10px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: fit-content;
  flex: 0 0 auto;
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
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
}

.image-4 {
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.frame-18 {
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

.text-19 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
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

.text-21 {
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
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 10px 0px;
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
  width: 24px;
  height: fit-content;
  flex: 0 0 auto;
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
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
}

.image-5 {
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.frame-21 {
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

.text-23 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-24 {
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

.text-25 {
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
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 10px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-23 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: fit-content;
  flex: 0 0 auto;
}

.text-26 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
}

.image-6 {
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.frame-24 {
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

.text-27 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-28 {
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

.text-29 {
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

.rectangle-2 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: rgba(255,255,255,0.10);
}

.frame-25 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 16px 8px 16px;
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
  margin: 0px 0px 12px 0px;
}

.text-30 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 21px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-2 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-27 {
  box-sizing: border-box;
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-28 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.image-7 {
  box-sizing: border-box;
  width: 100%;
  height: 140px;
  border-radius: 8px;
  object-fit: cover;
}

.frame-29 {
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

.frame-30 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: rgba(94,106,210,0.15);
  border-radius: 4px;
}

.vector-3 {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
}

.text-31 {
  box-sizing: border-box;
  min-width: 106px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-32 {
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

.frame-31 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.image-8 {
  box-sizing: border-box;
  width: 100%;
  height: 140px;
  border-radius: 8px;
  object-fit: cover;
}

.frame-32 {
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

.frame-33 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: rgba(94,106,210,0.15);
  border-radius: 4px;
}

.vector-4 {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
}

.text-33 {
  box-sizing: border-box;
  min-width: 83px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-34 {
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

.frame-34 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.image-9 {
  box-sizing: border-box;
  width: 100%;
  height: 140px;
  border-radius: 8px;
  object-fit: cover;
}

.frame-35 {
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

.frame-36 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: rgba(94,106,210,0.15);
  border-radius: 4px;
}

.vector-5 {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
}

.text-35 {
  box-sizing: border-box;
  min-width: 78px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-36 {
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

.frame-37 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.image-10 {
  box-sizing: border-box;
  width: 100%;
  height: 140px;
  border-radius: 8px;
  object-fit: cover;
}

.frame-38 {
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

.frame-39 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: rgba(94,106,210,0.15);
  border-radius: 4px;
}

.vector-6 {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
}

.text-37 {
  box-sizing: border-box;
  min-width: 74px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-38 {
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

.frame-40 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 24px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-41 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: rgba(255,255,255,0.03);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.10);
}

.frame-42 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: rgba(94,106,210,0.15);
  border-radius: 8px;
}

.vector-7 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.frame-43 {
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

.text-39 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-40 {
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

.vector-8 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-44 {
  box-sizing: border-box;
  position: fixed;
  display: flex;
  flex-direction: row;
  bottom: calc(0px + env(safe-area-inset-bottom, 0px));
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 40px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-height: 64px;
  background-color: rgba(10,10,11,0.92);
  border: 1px solid rgba(255,255,255,0.10);
  backdrop-filter: blur(12px);
}

.frame-45 {
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

.text-41 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-46 {
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

.text-42 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-47 {
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

.text-43 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  -webkit-font-smoothing: antialiased;
  color: #5e6ad2;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
