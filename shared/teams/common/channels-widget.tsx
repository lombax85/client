import * as React from 'react'
import * as Kb from '../../common-adapters'
import * as Styles from '../../styles'
import * as Types from '../../constants/types/teams'
import ChannelPopup from '../team/settings-tab/channel-popup'
import useAutocompleter from './use-autocompleter'
import {useAllChannelMetas} from './channel-hooks'

type Props = {
  channels: Array<Types.ChannelNameID>
  disableGeneral?: boolean
  onAddChannel: (toAdd: Array<Types.ChannelNameID>) => void
  onRemoveChannel: (toRemove: Types.ChannelNameID) => void
  teamID: Types.TeamID
}

// always shows #general
const ChannelsWidget = (props: Props) => (
  <Kb.Box2 direction="vertical" gap="tiny" style={styles.container} fullWidth={true}>
    <ChannelInput
      onAdd={props.onAddChannel}
      teamID={props.teamID}
      selected={props.channels}
      disableGeneral={props.disableGeneral}
    />
    <Kb.Box2 direction="horizontal" gap="xtiny" fullWidth={true} style={styles.pillContainer}>
      {props.channels.map(channel => (
        <ChannelPill
          key={channel.channelname}
          channelname={channel.channelname}
          onRemove={channel.channelname === 'general' ? undefined : () => props.onRemoveChannel(channel)}
        />
      ))}
    </Kb.Box2>
  </Kb.Box2>
)

type ChannelInputProps = {
  disableGeneral?: boolean
  onAdd: (toAdd: Array<Types.ChannelNameID>) => void
  selected: Array<Types.ChannelNameID>
  teamID: Types.TeamID
}

const ChannelInputDesktop = ({disableGeneral, onAdd, selected, teamID}: ChannelInputProps) => {
  const [filter, setFilter] = React.useState('')
  const channels = useAllChannelMetas(teamID)
  const channelItems = [...channels.values()]
    .filter(
      c =>
        !selected.find(channel => channel.conversationIDKey === c.conversationIDKey) &&
        (!disableGeneral || c.channelname !== 'general')
    )
    .map(c => ({
      label: `#${c.channelname}`,
      value: {channelname: c.channelname, conversationIDKey: c.conversationIDKey},
    }))

  const onSelect = (value: Unpacked<typeof channelItems>['value']) => {
    onAdd([value])
    setFilter('')
  }

  const {popup, popupAnchor, onKeyDown, setShowingPopup} = useAutocompleter(channelItems, onSelect, filter)

  return (
    <>
      <Kb.SearchFilter
        // @ts-ignore complaining that popupAnchor is missing properties that SearchFilter has
        ref={popupAnchor}
        onFocus={() => setShowingPopup(true)}
        onBlur={() => setShowingPopup(false)}
        placeholderText="Add channels"
        icon="iconfont-search"
        onChange={setFilter}
        size={Styles.isMobile ? 'full-width' : 'small'}
        onKeyDown={onKeyDown}
        value={filter}
        valueControlled={true}
      />
      {popup}
    </>
  )
}

const ChannelInputMobile = ({disableGeneral, onAdd, selected, teamID}: ChannelInputProps) => {
  const [showingPopup, setShowingPopup] = React.useState(false)
  const onComplete = (channels: Array<Types.ChannelNameID>) => {
    setShowingPopup(false)
    onAdd(channels)
  }
  return (
    <Kb.ClickableBox onClick={() => setShowingPopup(true)}>
      <Kb.Box2
        direction="horizontal"
        gap="tiny"
        alignSelf="stretch"
        centerChildren={true}
        style={styles.channelDummyInput}
      >
        <Kb.Icon type="iconfont-search" color={Styles.globalColors.black_50} sizeType="Small" />
        <Kb.Text type="BodySemibold" style={styles.channelDummyInputText}>
          Add channels
        </Kb.Text>
      </Kb.Box2>
      {showingPopup && (
        <ChannelPopup
          teamID={teamID}
          onCancel={() => setShowingPopup(false)}
          onComplete={onComplete}
          disabledChannels={selected}
          hideGeneral={disableGeneral}
        />
      )}
    </Kb.ClickableBox>
  )
}

const ChannelInput = Styles.isMobile ? ChannelInputMobile : ChannelInputDesktop

const ChannelPill = ({channelname, onRemove}: {channelname: string; onRemove?: () => void}) => (
  <Kb.Box2 direction="horizontal" gap="tiny" alignItems="center" style={styles.pill}>
    <Kb.Text type={Styles.isMobile ? 'Body' : 'BodySemibold'}>#{channelname}</Kb.Text>
    {onRemove && <Kb.Icon type="iconfont-remove" onClick={onRemove} color={Styles.globalColors.black_20} />}
  </Kb.Box2>
)

const styles = Styles.styleSheetCreate(() => ({
  channelDummyInput: {
    backgroundColor: Styles.globalColors.black_10,
    borderRadius: Styles.borderRadius,
    paddingBottom: Styles.globalMargins.xtiny,
    paddingTop: Styles.globalMargins.xtiny,
  },
  channelDummyInputText: {color: Styles.globalColors.black_50},
  container: {
    ...Styles.padding(Styles.globalMargins.tiny),
    backgroundColor: Styles.globalColors.blueGrey,
    borderRadius: Styles.borderRadius,
  },
  pill: Styles.platformStyles({
    common: {
      ...Styles.padding(Styles.globalMargins.xtiny, Styles.globalMargins.tiny),
      backgroundColor: Styles.globalColors.white,
      borderRadius: Styles.borderRadius,
      marginBottom: Styles.globalMargins.xtiny,
    },
    isMobile: {
      borderColor: Styles.globalColors.black_20,
      borderStyle: 'solid',
      borderWidth: 1,
    },
  }),
  pillContainer: {
    flexWrap: 'wrap',
  },
}))

export default ChannelsWidget
