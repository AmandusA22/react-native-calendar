import React, { Component, PropTypes } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  Platform,
  View,
} from 'react-native';

import Day from './Day';

import moment from 'moment';
import styles from './styles';

const DEVICE_WIDTH = Dimensions.get('window').width;
const VIEW_INDEX = 2;

function getNumberOfWeeks(month, weekStart) {
  const firstDay = moment(month).startOf('month').day();
  const offset = (firstDay - weekStart + 7) % 7;
  const days = moment(month).daysInMonth();
  return Math.ceil((offset + days) / 7);
}

export default class Calendar extends Component {

  state = {
    currentMoment: moment(this.props.startDate),
    selectedMoment: moment(this.props.selectedDate),
    calendarFormat: this.props.calendarFormat,
  };

  static propTypes = {
    customStyle: PropTypes.object,
    dayHeadings: PropTypes.array,
    eventDates: PropTypes.array,
    monthNames: PropTypes.array,
    nextButtonText: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object,
    ]),
    onDateSelect: PropTypes.func,
    onSwipeNext: PropTypes.func,
    onSwipePrev: PropTypes.func,
    onTouchNext: PropTypes.func,
    onTouchPrev: PropTypes.func,
    onTitlePress: PropTypes.func,
    prevButtonText: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object,
    ]),
    scrollEnabled: PropTypes.bool,
    selectedDate: PropTypes.any,
    showControls: PropTypes.bool,
    showEventIndicators: PropTypes.bool,
    startDate: PropTypes.any,
    titleFormat: PropTypes.string,
    today: PropTypes.any,
    weekStart: PropTypes.number,
    calendarFormat: PropTypes.oneOf(['monthly', 'weekly']),
  };

  static defaultProps = {
    customStyle: {},
    width: DEVICE_WIDTH,
    dayHeadings: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    eventDates: [],
    monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    nextButtonText: 'Next',
    prevButtonText: 'Prev',
    scrollEnabled: false,
    showControls: false,
    showEventIndicators: false,
    startDate: moment().format('YYYY-MM-DD'),
    titleFormat: 'MMMM YYYY',
    today: moment(),
    weekStart: 1,
    calendarFormat: 'monthly', // weekly or monthly
  };

  componentDidMount() {
    // fixes initial scrolling bug on Android
    setTimeout(() => this.scrollToItem(VIEW_INDEX), 0);
  }

  componentDidUpdate() {
    this.scrollToItem(VIEW_INDEX);
  }

  componentWillReceiveProps(props) {
    if (props.selectedDate) {

       this.setState({ selectedMoment: props.selectedDate });
    }
    if (props.selectedDate !== this.props.selectedDate) {
      this.setState({ selectedMoment: moment(props.selectedDate),
        currentMoment: moment(props.selectedDate) });
    }

    if (this.props.calendarFormat !== props.calendarFormat && props.calendarFormat === 'monthly') {
      const numOfWeeks = getNumberOfWeeks(this.state.currentMonthMoment, this.props.weekStart);
      this.setState({
        calendarFormat: props.calendarFormat,
        calendarHeight: numOfWeeks * this.state.rowHeight,
      });
    }

    if (this.props.calendarFormat !== props.calendarFormat && props.calendarFormat === 'weekly') {

        this.setState({
          calendarFormat: props.calendarFormat,
          calendarHeight: 120,
        });
    }
  }

  getStack(currentMoment) {
    if (this.props.scrollEnabled) {
      const res = [];
      for (let i = -VIEW_INDEX; i <= VIEW_INDEX; i++) {
        if (this.state.calendarFormat === 'monthly') {
          res.push(moment(currentMoment).add(i, 'month'));
        } else {
          res.push(moment(currentMoment).add(i, 'week'));
        }
      }
      return res;
    }
    return [moment(currentMoment)];
  }

  prepareEventDates(eventDates, events) {
    const parsedDates = {};

    if (events) {
      events.forEach((event) => {
        if (event.date) {
          parsedDates[event.date] = event;
        }
      });
    } else {
      eventDates.forEach((event) => {
        parsedDates[event] = {};
      });
    }

    return parsedDates;
  }

  selectDate(date) {
    this.setState({ selectedMoment: date,
      currentMoment: date });
  }

  onPrev = () => {
    const newMoment = this.state.calendarFormat === 'monthly' ?
            moment(this.state.currentMoment).subtract(1, 'month') :
            moment(this.state.currentMoment).subtract(1, 'week');
    this.setState({ currentMoment: newMoment });
    this.props.onTouchPrev && this.props.onTouchPrev(newMoment);
  }

  onNext = () => {
    const newMoment = this.state.calendarFormat === 'monthly' ?
            moment(this.state.currentMoment).add(1, 'month') :
            moment(this.state.currentMoment).add(1, 'week');
    this.setState({ currentMoment: newMoment });
    this.props.onTouchNext && this.props.onTouchNext(newMoment);
  }

  scrollToItem(itemIndex) {
    const scrollToX = itemIndex * this.props.width;
    if (this.props.scrollEnabled) {
      this._calendar.scrollTo({ y: 0, x: scrollToX, animated: false });
    }
  }

  scrollEnded(event) {
    const position = event.nativeEvent.contentOffset.x;
    const currentPage = position / this.props.width;
    const newMoment = this.state.calendarFormat === 'monthly' ?
            moment(this.state.currentMoment).add(currentPage - VIEW_INDEX, 'month') :
            moment(this.state.currentMoment).add(currentPage - VIEW_INDEX, 'week');

      this.setState({ currentMoment: newMoment }, () => {
        const calendarDates = this.getStack(newMoment);
        const dates = calendarDates.map(date => this.getStartMoment(this.props.calendarFormat, newMoment))
        const firstDay = dates.slice(-1)[0]
      if (currentPage < VIEW_INDEX) {
        this.props.onSwipePrev && this.props.onSwipePrev(firstDay);
      } else if (currentPage > VIEW_INDEX) {
        this.props.onSwipeNext && this.props.onSwipeNext(firstDay);
      }
    });
  }

  getStartMoment(calFormat, currMoment) {
    const weekStart = this.props.weekStart;

    let res;
    if (calFormat === 'monthly') {
      res = moment(currMoment).startOf('month');
    } else {
      // weekly
      const sundayMoment = moment(currMoment).startOf('week');
      if (weekStart > 0) {
        res = moment(currMoment).isoWeekday(weekStart);
        if (res.diff(currMoment) > 0) {
          res = moment(currMoment).subtract(7, 'day').isoWeekday(weekStart);
        }
      } else {
        res = sundayMoment;
      }
    }
    return res;
  }

  renderCalendarView(calFormat, argMoment, eventsMap) {
    let renderIndex = 0,
      weekRows = [],
      days = [];

    const
      startOfArgMoment = this.getStartMoment(calFormat, argMoment),
      selectedMoment = moment(this.state.selectedMoment),
      weekStart = this.props.weekStart,
      todayMoment = moment(this.props.today),
      todayIndex = todayMoment.date() - 1,
      argDaysCount = calFormat === 'monthly' ? argMoment.daysInMonth() : 7,
      offset = calFormat === 'monthly' ?
      (startOfArgMoment.isoWeekday() - weekStart + 7) % 7 : 0;
    do {
      const dayIndex = renderIndex - offset;
      const isoWeekday = (renderIndex + weekStart) % 7;
      const thisMoment = moment(startOfArgMoment).add(dayIndex, 'day');

      const isFiller = dayIndex < 0 || dayIndex >= argDaysCount;
      const isSelected = selectedMoment.isSame(thisMoment);
      days.push((
        <Day
          startOfMonth={startOfArgMoment}
          isWeekend={isoWeekday === 0 || isoWeekday === 6}
          key={`${renderIndex}`}
          onPress={() => {
            this.selectDate(thisMoment);
            this.props.onDateSelect && this.props.onDateSelect(thisMoment ? thisMoment.format() : null);
          }}
          caption={`${thisMoment.format('D')}`}
          isToday={todayMoment.format('YYYY-MM-DD') == thisMoment.format('YYYY-MM-DD')}
          isSelected={isSelected}
          event={eventsMap[thisMoment.format('YYYY-MM-DD')] ||
                 eventsMap[thisMoment.format('YYYYMMDD')]}
          showEventIndicators={this.props.showEventIndicators}
          customStyle={this.props.customStyle}
          filler={isFiller}
        />
      ));

      if (renderIndex % 7 === 6) {
        weekRows.push(
          <View
            key={weekRows.length}
            style={[styles.weekRow, this.props.customStyle.weekRow]}
          >
            {days}
          </View>);
        days = [];
        if (dayIndex + 1 >= argDaysCount) {
          break;
        }
      }
      renderIndex += 1;
    } while (true);
    const containerStyle = [styles.monthContainer, this.props.customStyle.monthContainer];
    return <View key={argMoment.format('YYYY-MM-DD')} style={containerStyle}>{weekRows}</View>;
  }

  renderHeading() {
    const headings = [];
    for (let i = 0; i < 7; i++) {
      const j = (i + this.props.weekStart) % 7;
      headings.push(
        <Text
          key={i}
          style={j === 0 || j === 6 ?
                  [styles.weekendHeading, this.props.customStyle.weekendHeading] :
           [styles.dayHeading, this.props.customStyle.dayHeading]}
        >
          {this.props.dayHeadings[j]}
        </Text>,
      );
    }

    return (
      <View style={[styles.calendarHeading, this.props.customStyle.calendarHeading]}>
        {headings}
      </View>
    );
  }

  renderTopBar() {
    const localizedMonth = this.props.monthNames[this.state.currentMoment.month()];
    return this.props.showControls
      ? (
        <View style={[styles.calendarControls, this.props.customStyle.calendarControls]}>
          <TouchableOpacity
            style={[styles.controlButton, this.props.customStyle.controlButton]}
            onPress={this.onPrev}
          >
              {this.props.prevButtonText}
          </TouchableOpacity>
          <TouchableOpacity style={styles.title} onPress={() => this.props.onTitlePress && this.props.onTitlePress()}>
           <Text style={[styles.titleText, this.props.customStyle.title,{top: Platform.OS === 'android' ? -5.7: 0}]}>
            {this.props.calendarFormat === 'monthly' ? `${localizedMonth} ${this.state.currentMoment.year()}` : null}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, this.props.customStyle.controlButton]}
            onPress={this.onNext}
          >
            {this.props.nextButtonText}
          </TouchableOpacity>
        </View>
      )
    : (
      <View style={[styles.calendarControls, this.props.customStyle.calendarControls]}>
        <Text style={[styles.title, this.props.customStyle.title]}>
          {this.state.currentMoment.format(this.props.titleFormat)}
        </Text>
      </View>
    );
  }

  render() {
    const calendarDates = this.getStack(this.state.currentMoment);
    const eventDatesMap = this.prepareEventDates(this.props.eventDates, this.props.events);
    return (
      <View style={[styles.calendarContainer, this.props.customStyle.calendarContainer, { height: this.state.calendarHeight }]}>
        {this.renderTopBar()}
        {this.renderHeading(this.props.titleFormat)}
        {this.props.scrollEnabled ?
          <ScrollView
            ref={calendar => this._calendar = calendar}
            horizontal
            scrollEnabled
            pagingEnabled
            removeClippedSubviews
            scrollEventThrottle={1000}
            showsHorizontalScrollIndicator={false}
            automaticallyAdjustContentInsets={false}
            onMomentumScrollEnd={event => this.scrollEnded(event)}
          >
            {calendarDates.map(date => this.renderCalendarView(this.props.calendarFormat, moment(date), eventDatesMap))}
          </ScrollView>
         :
          <View ref={calendar => this._calendar = calendar}>
            {calendarDates.map(date => this.renderCalendarView(this.state.calendarFormat, moment(date), eventDatesMap))}
          </View>
         }
      </View>
    );
  }
}
