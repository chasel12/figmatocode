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
  <view id="page-79" class="page-1">
    <view class="frame-1">
      <text class="text-1">晚上好</text>
      <view class="frame-2">
        <text class="text-2">回声</text>
        <view class="frame-3">
          <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTAuMjY4IDIxYTIgMiAwIDAgMCAzLjQ2NCAwTTMuMjYyIDE1LjMyNkExIDEgMCAwIDAgNCAxN2gxNmExIDEgMCAwIDAgLjc0LTEuNjczQzE5LjQxIDEzLjk1NiAxOCAxMi40OTkgMTggOEE2IDYgMCAwIDAgNiA4YzAgNC40OTktMS40MTEgNS45NTYtMi43MzggNy4zMjYiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
      </view>
    </view>
    <view class="frame-4">
      <text class="text-3">TODAY'S PICK</text>
      <view class="frame-5">
        <view class="image-1 ui-image-placeholder ui-image-ph-hero-142"></view>
        <view class="frame-6">
          <view class="frame-7">
            <text class="text-4">夜航西飞</text>
            <text class="text-5">专辑</text>
          </view>
          <text class="text-6">陈默</text>
          <view class="frame-8" @tap="go('/pages/p-2/index')">
            <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZWRmMWZlIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNNiAzTDIwIDEyTDYgMjFMNiAzWiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
            <text class="text-7">播放</text>
          </view>
        </view>
      </view>
    </view>
    <view class="frame-9">
      <view class="frame-10">
        <text class="text-8">为你精选</text>
        <text class="text-9">全部</text>
      </view>
      <view class="frame-11">
        <view class="frame-12">
          <view class="image-2 ui-image-placeholder ui-image-ph-hero-353"></view>
          <text class="text-10">午夜频率</text>
          <text class="text-11">128 万次播放</text>
        </view>
        <view class="frame-13">
          <view class="image-3 ui-image-placeholder ui-image-ph-hero-353"></view>
          <text class="text-12">城市回声</text>
          <text class="text-13">86 万次播放</text>
        </view>
        <view class="frame-14">
          <view class="image-4 ui-image-placeholder ui-image-ph-hero-353"></view>
          <text class="text-14">雨夜慢速</text>
          <text class="text-15">42 万次播放</text>
        </view>
      </view>
    </view>
    <view class="frame-15">
      <view class="frame-16">
        <text class="text-16">新歌速递</text>
        <text class="text-17">更多</text>
      </view>
      <view class="frame-17">
        <view class="frame-18">
          <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMDBkM2JiIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNOSAxOFY1bDEyLTJ2MTNNMyAxOGEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwTTE1IDE2YTMgMyAwIDEgMCA2IDBhMyAzIDAgMSAwIC02IDAiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-19">
          <text class="text-18">夜航西飞</text>
          <text class="text-19">陈默</text>
        </view>
        <text class="text-20">04:12</text>
      </view>
      <view class="frame-20">
        <view class="frame-21">
          <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMDBkM2JiIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNOSAxOFY1bDEyLTJ2MTNNMyAxOGEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwTTE1IDE2YTMgMyAwIDEgMCA2IDBhMyAzIDAgMSAwIC02IDAiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-22">
          <text class="text-21">雾中列车</text>
          <text class="text-22">林知遥</text>
        </view>
        <text class="text-23">03:38</text>
      </view>
      <view class="frame-23">
        <view class="frame-24">
          <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMDBkM2JiIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNOSAxOFY1bDEyLTJ2MTNNMyAxOGEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwTTE1IDE2YTMgMyAwIDEgMCA2IDBhMyAzIDAgMSAwIC02IDAiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-25">
          <text class="text-24">第七个夏天</text>
          <text class="text-25">白日梦旅人</text>
        </view>
        <text class="text-26">04:56</text>
      </view>
      <view class="frame-26">
        <view class="frame-27">
          <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMDBkM2JiIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNOSAxOFY1bDEyLTJ2MTNNMyAxOGEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwTTE1IDE2YTMgMyAwIDEgMCA2IDBhMyAzIDAgMSAwIC02IDAiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-28">
          <text class="text-27">海岸线以南</text>
          <text class="text-28">苏野</text>
        </view>
        <text class="text-29">03:21</text>
      </view>
    </view>
    <view class="frame-29">
      <view class="frame-30">
        <view class="vector-7" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjA1ZGZmIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0xNSAyMXYtOGExIDEgMCAwIDAtMS0xaC00YTEgMSAwIDAgMC0xIDF2OE0zIDEwYTIgMiAwIDAgMSAuNzA5LTEuNTI4bDctNS45OTlhMiAyIDAgMCAxIDIuNTgyIDBsNyA1Ljk5OUEyIDIgMCAwIDEgMjEgMTB2OWEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnoiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-30">发现</text>
      </view>
      <view class="frame-31" @tap="switchTo('/pages/p-4/index')">
        <view class="vector-8" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTgiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0zIDExYTggOCAwIDEgMCAxNiAwYTggOCAwIDEgMCAtMTYgMG0yMSAyMS00LjMtNC4zIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-31">搜索</text>
      </view>
      <view class="frame-32" @tap="switchTo('/pages/p-5/index')">
        <view class="vector-9" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTkiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik05IDE4VjVsMTItMnYxM00zIDE4YTMgMyAwIDEgMCA2IDBhMyAzIDAgMSAwIC02IDBNMTUgMTZhMyAzIDAgMSAwIDYgMGEzIDMgMCAxIDAgLTYgMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-32">我的音乐</text>
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
  background-color: #1d232a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.frame-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 24px 20px 20px 20px;
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
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.8px;
  color: #e4e4e7;
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
  justify-content: space-between;
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
  font-size: 30px;
  font-weight: 600;
  line-height: 36px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -1px;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #191e24;
  border-radius: 8px;
  border: 1px solid #15191e;
}

.vector-1 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0px 20px;
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
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.8px;
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #191e24;
  border-radius: 16px;
  border: 1px solid #15191e;
  box-shadow: 0px 8px 24px -8px rgba(0,0,0,0.45);
}

.image-1 {
  box-sizing: border-box;
  width: 100%;
  height: 176px;
  border-radius: 0px;
  overflow: hidden;
  object-fit: cover;
}

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
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
  justify-content: space-between;
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
  font-size: 18px;
  font-weight: 600;
  line-height: 23px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.3px;
  color: #ecf9ff;
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
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.6px;
  color: #00d3bb;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
  -webkit-font-smoothing: antialiased;
  color: #e4e4e7;
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
  width: 100%;
  height: 44px;
  margin: 6px 0px 0px 0px;
  background-image: linear-gradient(180deg, #605dff 0%, #f43098 100%);
  border-radius: 12px;
  box-shadow: 0px 6px 16px -4px rgba(0,0,0,0.40);
}

.vector-2 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #edf1fe;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 0px 0px 0px;
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
  padding: 0px 20px;
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
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #ecf9ff;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px 12px;
  padding: 0px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-12 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 136px;
  height: fit-content;
  flex: 0 0 auto;
  flex-shrink: 0;
}

.image-2 {
  box-sizing: border-box;
  width: 100%;
  height: 136px;
  border-radius: 8px;
  object-fit: cover;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 136px;
  height: fit-content;
  flex: 0 0 auto;
  flex-shrink: 0;
}

.image-3 {
  box-sizing: border-box;
  width: 100%;
  height: 136px;
  border-radius: 8px;
  object-fit: cover;
}

.text-12 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 136px;
  height: fit-content;
  flex: 0 0 auto;
  flex-shrink: 0;
}

.image-4 {
  box-sizing: border-box;
  width: 100%;
  height: 136px;
  border-radius: 8px;
  object-fit: cover;
}

.text-14 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 28px 20px 0px 20px;
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
  justify-content: space-between;
  padding: 0px 0px 8px 0px;
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
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #ecf9ff;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-17 {
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

.frame-18 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #15191e;
  border-radius: 999px;
}

.vector-3 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
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
  color: #e4e4e7;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-20 {
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

.frame-21 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #15191e;
  border-radius: 999px;
}

.vector-4 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-22 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
}

.text-21 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-23 {
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

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #15191e;
  border-radius: 999px;
}

.vector-5 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-25 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
}

.text-24 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-26 {
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

.frame-27 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #15191e;
  border-radius: 999px;
}

.vector-6 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-28 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  height: fit-content;
  flex: 1 1 0;
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
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
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
  color: #e4e4e7;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-29 {
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
  background-color: #191e24;
  border: 1px solid #15191e;
  box-shadow: 0px -4px 16px -6px rgba(0,0,0,0.45);
}

.frame-30 {
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

.vector-7 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-30 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #605dff;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-31 {
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

.text-31 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-32 {
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
