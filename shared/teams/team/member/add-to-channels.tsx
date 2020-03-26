import * as React from 'react'
import * as Kb from '../../../common-adapters'
import * as Styles from '../../../styles'
import * as ChatConstants from '../../../constants/chat2'
import * as Types from '../../../constants/types/teams'
import * as Container from '../../../util/container'
import * as RPCChatGen from '../../../constants/types/rpc-chat-gen'
import * as ChatTypes from '../../../constants/types/chat2'
import * as ChatGen from '../../../actions/chat2-gen'
import * as Common from '../../common'
import {pluralize} from '../../../util/string'
import {memoize} from '../../../util/memoize'
import {useAllChannelMetas} from '../../common/channel-hooks'

type Props = Container.RouteProps<{
  mode: 'self' | 'others'
  teamID: Types.TeamID
  usernames?: Array<string>
}>

const getChannelsForList = memoize(
  (channels: Map<ChatTypes.ConversationIDKey, ChatTypes.ConversationMeta>) => {
    const processed = [...channels.values()].reduce(
      ({list, general}: {general: ChatTypes.ConversationMeta; list: Array<ChatTypes.ConversationMeta>}, c) =>
        c.channelname === 'general' ? {general: c, list} : {general, list: [...list, c]},
      {general: ChatConstants.makeConversationMeta(), list: []}
    )
    const {list, general} = processed
    const sortedList = list.sort((a, b) => a.channelname.localeCompare(b.channelname))
    return {
      channelMetaGeneral: general,
      channelMetasAll: [general, ...sortedList],
      channelMetasFiltered: sortedList,
    }
  }
)

const AddToChannels = (props: Props) => {
  const dispatch = Container.useDispatch()
  const nav = Container.useSafeNavigation()
  const teamID = Container.getRouteProps(props, 'teamID', Types.noTeamID)
  const mode = Container.getRouteProps(props, 'mode', 'self')
  const myUsername = Container.useSelector(state => state.config.username)
  const usernames =
    Container.getRouteProps(props, 'usernames', undefined) ?? mode === 'self' ? [myUsername] : []

  const {channelMetas, loadingChannels} = useAllChannelMetas(teamID)
  const {channelMetasAll, channelMetasFiltered, channelMetaGeneral} = getChannelsForList(channelMetas)

  const participantMap = Container.useSelector(s => s.chat2.participantMap)
  const [filter, setFilter] = React.useState('')
  const filterLCase = filter.trim().toLowerCase()
  const [filtering, setFiltering] = React.useState(false)
  const channels = filterLCase
    ? channelMetasAll.filter(c => c.channelname.toLowerCase().includes(filterLCase))
    : channelMetasAll
  const items = [
    ...(filtering ? [] : [{type: 'header' as const}]),
    ...channels.map(c => ({
      channelMeta: c,
      numMembers: participantMap.get(c.conversationIDKey)?.name?.length ?? 0,
      type: 'channel' as const,
    })),
  ]
  const [selected, setSelected] = React.useState(new Set<ChatTypes.ConversationIDKey>())
  const onSelect = (convIDKey: ChatTypes.ConversationIDKey) => {
    if (convIDKey === channelMetaGeneral.conversationIDKey) return
    if (selected.has(convIDKey)) {
      selected.delete(convIDKey)
      setSelected(new Set(selected))
    } else {
      selected.add(convIDKey)
      setSelected(new Set(selected))
    }
  }
  const onSelectAll = () =>
    setSelected(new Set([...channelMetasFiltered.values()].map(c => c.conversationIDKey)))
  const onSelectNone = () => setSelected(new Set())

  const onCancel = () => dispatch(nav.safeNavigateUpPayload())
  const onCreate = () =>
    dispatch(nav.safeNavigateAppendPayload({path: [{props: {teamID}, selected: 'chatCreateChannel'}]}))

  const submit = Container.useRPC(RPCChatGen.localBulkAddToManyConvsRpcPromise)
  const [waiting, setWaiting] = React.useState(false)
  const onFinish = () => {
    if (!selected.size) {
      onCancel()
      return
    }
    setWaiting(true)
    submit(
      [{conversations: [...selected].map(ChatTypes.keyToConversationID), usernames}],
      () => {
        setWaiting(false)
        onCancel()
      },
      error => {
        console.error(error)
        setWaiting(false)
      }
    )
  }

  const numSelected = selected.size

  const renderItem = (_, item: Unpacked<typeof items>) => {
    switch (item.type) {
      case 'header': {
        const allSelected = selected.size === channelMetasFiltered.length
        return (
          <HeaderRow
            key="{header}"
            mode={mode}
            onCreate={onCreate}
            onSelectAll={allSelected ? undefined : onSelectAll}
            onSelectNone={allSelected ? onSelectNone : undefined}
          />
        )
      }
      case 'channel':
        return (
          <ChannelRow
            key={item.channelMeta.channelname}
            channelMeta={item.channelMeta}
            numMembers={item.numMembers}
            selected={
              selected.has(item.channelMeta.conversationIDKey) ||
              item.channelMeta.conversationIDKey === channelMetaGeneral.conversationIDKey
            }
            onSelect={() => onSelect(item.channelMeta.conversationIDKey)}
            mode={mode}
          />
        )
    }
  }

  // TODO: alternate title when there aren't channels yet?
  const title =
    mode === 'self' ? 'Browse all channels' : `Add${usernames.length === 1 ? ` ${usernames[0]}` : ''} to...`
  return (
    <Kb.Modal
      header={{
        hideBorder: Styles.isMobile,
        leftButton: Styles.isMobile ? (
          <Kb.Text type="BodyBigLink" onClick={onCancel}>
            Cancel
          </Kb.Text>
        ) : (
          undefined
        ),
        rightButton:
          Styles.isMobile && mode === 'others' ? (
            <Kb.Text type="BodyBigLink" onClick={onFinish} style={!numSelected && styles.disabled}>
              Add
            </Kb.Text>
          ) : (
            undefined
          ),
        title: <Common.ModalTitle teamID={teamID} title={title} />,
      }}
      footer={
        Styles.isMobile || mode === 'self'
          ? undefined
          : {
              content: (
                <Kb.Box2 direction="horizontal" gap="tiny" fullWidth={true}>
                  <Kb.Button
                    type="Dim"
                    label="Cancel"
                    onClick={onCancel}
                    style={Styles.globalStyles.flexOne}
                    disabled={waiting}
                  />
                  <Kb.Button
                    label={
                      numSelected ? `Add to ${numSelected} ${pluralize('channel', numSelected)}` : 'Add...'
                    }
                    onClick={onFinish}
                    disabled={!numSelected}
                    style={Styles.globalStyles.flexOne}
                    waiting={waiting}
                  />
                </Kb.Box2>
              ),
            }
      }
      allowOverflow={true}
      noScrollView={true}
      onClose={onCancel}
    >
      {loadingChannels ? (
        <Kb.ProgressIndicator type="Huge" />
      ) : (
        <Kb.Box2 direction="vertical" fullWidth={true} style={Styles.globalStyles.flexOne}>
          <Kb.Box2 direction="horizontal" fullWidth={true} style={styles.searchFilterContainer}>
            <Kb.SearchFilter
              placeholderText={`Search ${channelMetasAll.length} ${pluralize(
                'channel',
                channelMetasAll.length
              )}`}
              icon="iconfont-search"
              onChange={setFilter}
              size="full-width"
              hotkey="f"
              onFocus={() => setFiltering(true)}
              onBlur={() => setFiltering(false)}
            />
          </Kb.Box2>
          <Kb.Box2 direction="vertical" style={styles.listContainer} fullWidth={true}>
            <Kb.List2
              items={items}
              renderItem={renderItem}
              itemHeight={{height: Styles.isMobile ? 48 : mode === 'self' ? 72 : 56, type: 'fixed'}}
            />
          </Kb.Box2>
        </Kb.Box2>
      )}
    </Kb.Modal>
  )
}

const HeaderRow = ({mode, onCreate, onSelectAll, onSelectNone}) => (
  <Kb.Box2
    direction="horizontal"
    alignItems="center"
    fullWidth={true}
    style={Styles.collapseStyles([styles.item, styles.headerItem, mode === 'self' && styles.itemSelf])}
  >
    <Kb.Button label="Create channel" small={true} mode="Secondary" onClick={onCreate} />
    {mode === 'self' ? (
      <Kb.Box />
    ) : (
      <Kb.Text type="BodyPrimaryLink" onClick={onSelectAll || onSelectNone}>
        {onSelectAll ? 'Select all' : 'Clear'}
      </Kb.Text>
    )}
  </Kb.Box2>
)

const SelfChannelActions = ({meta}: {meta: ChatTypes.ConversationMeta}) => {
  const dispatch = Container.useDispatch()
  const nav = Container.useSafeNavigation()
  const isAdmin = false
  const inChannel = meta.membershipType === 'active'
  const onEditChannel = () => {} // TODO: show another modal with a back button to here
  const actionProps = {conversationIDKey: meta.conversationIDKey, teamID: meta.teamID}
  const onAdministrate = () =>
    dispatch(nav.safeNavigateAppendPayload({path: [{props: actionProps, selected: 'teamChannel'}]}))
  const onDelete = () =>
    // TODO: reload this list or at least hide this row
    dispatch(nav.safeNavigateAppendPayload({path: [{props: actionProps, selected: 'teamDeleteChannel'}]}))
  const onLeave = () =>
    dispatch(
      ChatGen.createLeaveConversation({conversationIDKey: meta.conversationIDKey, dontNavigateToInbox: true})
    )
  const onJoin = () => dispatch(ChatGen.createJoinConversation({conversationIDKey: meta.conversationIDKey}))

  const menuItems = [
    {onClick: onEditChannel, title: 'Edit channel'},
    ...(isAdmin
      ? [
          {onClick: onAdministrate, title: 'Administrate'},
          {danger: true, onClick: onDelete, title: 'Delete'},
        ]
      : []),
  ]
  const {popupAnchor, showingPopup, toggleShowingPopup, popup} = Kb.usePopup(getAttachmentRef => (
    <Kb.FloatingMenu
      attachTo={getAttachmentRef}
      visible={showingPopup}
      onHidden={toggleShowingPopup}
      closeOnSelect={true}
      items={menuItems}
    />
  ))
  const [buttonMousedOver, setMouseover] = React.useState(false)
  return (
    <Kb.Box2 direction="horizontal" gap="xtiny" fullHeight={true}>
      {popup}
      {meta.channelname !== 'general' && (
        // TODO: waiting state
        // TODO: flip this to the other button after being clicked
        <Kb.Button
          type={buttonMousedOver && inChannel ? 'Default' : 'Success'}
          mode={inChannel ? 'Secondary' : 'Primary'}
          label={!inChannel ? 'Join' : buttonMousedOver ? 'Leave' : 'In'}
          icon={buttonMousedOver || !inChannel ? undefined : 'iconfont-check'}
          iconSizeType={buttonMousedOver || !inChannel ? undefined : 'Tiny'}
          onMouseEnter={Styles.isMobile ? undefined : () => setMouseover(true)}
          onMouseLeave={Styles.isMobile ? undefined : () => setMouseover(false)}
          onMouseDown={
            Styles.isMobile
              ? undefined
              : evt => {
                  // using onMouseDown so we can prevent blurring the search filter
                  evt.preventDefault()
                  inChannel ? onLeave() : onJoin()
                }
          }
          onClick={Styles.isMobile ? (inChannel ? onLeave : onJoin) : undefined}
          small={true}
          style={styles.joinLeaveButton}
        />
      )}
      <Kb.Button
        icon="iconfont-ellipsis"
        iconColor={Styles.globalColors.black_50}
        // TODO: this isn't working on desktop
        onClick={Styles.isMobile ? toggleShowingPopup : undefined}
        onMouseDown={
          Styles.isMobile
            ? undefined
            : evt => {
                // using onMouseDown so we can prevent blurring the search filter
                evt.preventDefault()
                toggleShowingPopup()
              }
        }
        ref={popupAnchor}
        small={true}
        mode="Secondary"
      />
    </Kb.Box2>
  )
}
type ChannelRowProps = {
  channelMeta: ChatTypes.ConversationMeta
  numMembers: number
  selected: boolean
  onSelect: () => void
  mode: 'self' | 'others'
}
const ChannelRow = ({channelMeta, mode, numMembers, selected, onSelect}: ChannelRowProps) => {
  const selfMode = mode === 'self'
  const numParticipants = Container.useSelector(
    s => ChatConstants.getParticipantInfo(s, channelMeta.conversationIDKey).all.length
  )
  const activityLevel = 'active' // TODO: plumbing
  return Styles.isMobile ? (
    <Kb.ClickableBox onClick={onSelect}>
      <Kb.Box2 direction="horizontal" style={styles.item} alignItems="center" fullWidth={true} gap="medium">
        <Kb.Box2 direction="vertical" style={Styles.globalStyles.flexOne}>
          <Kb.Box2 direction="horizontal" gap="tiny" alignSelf="flex-start">
            <Kb.Text type="Body" lineClamp={1} style={styles.channelText}>
              #{channelMeta.channelname}
            </Kb.Text>
            <Common.ParticipantMeta numParticipants={numParticipants} />
          </Kb.Box2>
          <Common.Activity level={activityLevel} />
        </Kb.Box2>
        {selfMode ? (
          <SelfChannelActions meta={channelMeta} />
        ) : (
          <Kb.CheckCircle
            checked={selected}
            onCheck={onSelect}
            disabled={channelMeta.channelname === 'general'}
          />
        )}
      </Kb.Box2>
    </Kb.ClickableBox>
  ) : (
    <Kb.ListItem2
      onMouseDown={
        selfMode
          ? undefined
          : evt => {
              // using onMouseDown so we can prevent blurring the search filter
              evt.preventDefault()
              onSelect()
            }
      }
      type="Large"
      action={
        selfMode ? (
          <SelfChannelActions meta={channelMeta} />
        ) : (
          <Kb.CheckCircle
            checked={selected}
            onCheck={() => {
              /* ListItem onMouseDown triggers this */
            }}
          />
        )
      }
      height={selfMode ? 72 : undefined}
      firstItem={true}
      body={
        <Kb.Box2 direction="vertical" alignItems="stretch">
          <Kb.Box2 direction="horizontal" gap="xtiny" alignSelf="flex-start">
            <Kb.Text type="Body" lineClamp={1} style={styles.channelText}>
              #{channelMeta.channelname}
            </Kb.Text>
            {selfMode && <Common.ParticipantMeta numParticipants={numParticipants} />}
          </Kb.Box2>
          <Kb.Box2 direction="horizontal" alignSelf="stretch" gap="xxtiny">
            {!selfMode && (
              <Kb.Text type="BodySmall">
                {numMembers} {pluralize('member', numMembers)} •
              </Kb.Text>
            )}
            <Common.Activity level={activityLevel} />
          </Kb.Box2>
          {selfMode && (
            <Kb.Text type="BodySmall" lineClamp={1}>
              {channelMeta.description}
            </Kb.Text>
          )}
        </Kb.Box2>
      }
      containerStyleOverride={{marginLeft: 16, marginRight: 8}}
    />
  )
}

const styles = Styles.styleSheetCreate(() => ({
  channelText: {flexShrink: 1},
  disabled: {opacity: 0.4},
  headerItem: {backgroundColor: Styles.globalColors.blueGrey},
  item: Styles.platformStyles({
    common: {justifyContent: 'space-between'},
    isElectron: {
      height: 56,
      ...Styles.padding(0, Styles.globalMargins.small),
    },
    isMobile: {
      ...Styles.padding(Styles.globalMargins.small),
    },
  }),
  itemSelf: Styles.platformStyles({isElectron: {height: 72}}),
  joinLeaveButton: {
    width: 63,
  },
  listContainer: Styles.platformStyles({
    isElectron: {
      height: 370, // shortcut to expand the modal
    },
    isMobile: Styles.globalStyles.flexOne,
  }),
  searchFilterContainer: Styles.platformStyles({
    isElectron: Styles.padding(Styles.globalMargins.tiny, Styles.globalMargins.small),
  }),
}))

export default AddToChannels
