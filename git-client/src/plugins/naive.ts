import {
  create,
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  NLoadingBarProvider,
} from 'naive-ui'

const naive = create({
  components: [
    NConfigProvider,
    NMessageProvider,
    NDialogProvider,
    NNotificationProvider,
    NLoadingBarProvider,
  ],
})

export default naive
