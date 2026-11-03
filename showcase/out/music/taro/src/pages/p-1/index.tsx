import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function PageP1() {
  return (
    <View id="page-79" className="page-1">
      <View className="frame-1">
        <Text className="text-1">{"晚上好"}</Text>
        <View className="frame-2">
          <Text className="text-2">{"回声"}</Text>
          <View className="frame-3">
            <svg className="vector-1" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#e4e4e7" strokeWidth="3" ><path d="M10.268 21a2 2 0 0 0 3.464 0M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" /></svg>
          </View>
        </View>
      </View>
      <View className="frame-4">
        <Text className="text-3">{"TODAY'S PICK"}</Text>
        <View className="frame-5">
          <div className="image-1 ui-image-placeholder ui-image-ph-hero-142"></div>
          <View className="frame-6">
            <View className="frame-7">
              <Text className="text-4">{"夜航西飞"}</Text>
              <Text className="text-5">{"专辑"}</Text>
            </View>
            <Text className="text-6">{"陈默"}</Text>
            <View className="frame-8" onClick={() => { Taro.navigateTo({ url: "/pages/p-2/index" }) }}>
              <svg className="vector-2" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#edf1fe" strokeWidth="3" ><path d="M6 3L20 12L6 21L6 3Z" /></svg>
              <Text className="text-7">{"播放"}</Text>
            </View>
          </View>
        </View>
      </View>
      <View className="frame-9">
        <View className="frame-10">
          <Text className="text-8">{"为你精选"}</Text>
          <Text className="text-9">{"全部"}</Text>
        </View>
        <View className="frame-11">
          <View className="frame-12">
            <div className="image-2 ui-image-placeholder ui-image-ph-hero-353"></div>
            <Text className="text-10">{"午夜频率"}</Text>
            <Text className="text-11">{"128 万次播放"}</Text>
          </View>
          <View className="frame-13">
            <div className="image-3 ui-image-placeholder ui-image-ph-hero-353"></div>
            <Text className="text-12">{"城市回声"}</Text>
            <Text className="text-13">{"86 万次播放"}</Text>
          </View>
          <View className="frame-14">
            <div className="image-4 ui-image-placeholder ui-image-ph-hero-353"></div>
            <Text className="text-14">{"雨夜慢速"}</Text>
            <Text className="text-15">{"42 万次播放"}</Text>
          </View>
        </View>
      </View>
      <View className="frame-15">
        <View className="frame-16">
          <Text className="text-16">{"新歌速递"}</Text>
          <Text className="text-17">{"更多"}</Text>
        </View>
        <View className="frame-17">
          <View className="frame-18">
            <svg className="vector-3" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#00d3bb" strokeWidth="3" ><path d="M9 18V5l12-2v13M3 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M15 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>
          </View>
          <View className="frame-19">
            <Text className="text-18">{"夜航西飞"}</Text>
            <Text className="text-19">{"陈默"}</Text>
          </View>
          <Text className="text-20">{"04:12"}</Text>
        </View>
        <View className="frame-20">
          <View className="frame-21">
            <svg className="vector-4" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#00d3bb" strokeWidth="3" ><path d="M9 18V5l12-2v13M3 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M15 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>
          </View>
          <View className="frame-22">
            <Text className="text-21">{"雾中列车"}</Text>
            <Text className="text-22">{"林知遥"}</Text>
          </View>
          <Text className="text-23">{"03:38"}</Text>
        </View>
        <View className="frame-23">
          <View className="frame-24">
            <svg className="vector-5" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#00d3bb" strokeWidth="3" ><path d="M9 18V5l12-2v13M3 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M15 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>
          </View>
          <View className="frame-25">
            <Text className="text-24">{"第七个夏天"}</Text>
            <Text className="text-25">{"白日梦旅人"}</Text>
          </View>
          <Text className="text-26">{"04:56"}</Text>
        </View>
        <View className="frame-26">
          <View className="frame-27">
            <svg className="vector-6" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#00d3bb" strokeWidth="3" ><path d="M9 18V5l12-2v13M3 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M15 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>
          </View>
          <View className="frame-28">
            <Text className="text-27">{"海岸线以南"}</Text>
            <Text className="text-28">{"苏野"}</Text>
          </View>
          <Text className="text-29">{"03:21"}</Text>
        </View>
      </View>
      <View className="frame-29">
        <View className="frame-30">
          <svg className="vector-7" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#605dff" strokeWidth="2.4" ><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
          <Text className="text-30">{"发现"}</Text>
        </View>
        <View className="frame-31" onClick={() => { Taro.reLaunch({ url: "/pages/p-4/index" }) }}>
          <svg className="vector-8" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#e4e4e7" strokeWidth="2.4" ><path d="M3 11a8 8 0 1 0 16 0a8 8 0 1 0 -16 0m21 21-4.3-4.3" /></svg>
          <Text className="text-31">{"搜索"}</Text>
        </View>
        <View className="frame-32" onClick={() => { Taro.reLaunch({ url: "/pages/p-5/index" }) }}>
          <svg className="vector-9" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#e4e4e7" strokeWidth="2.4" ><path d="M9 18V5l12-2v13M3 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M15 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>
          <Text className="text-32">{"我的音乐"}</Text>
        </View>
      </View>
    </View>
  )
}
