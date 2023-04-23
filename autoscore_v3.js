// This version counts live stones on the boundary
// to determine the winner.

var board
var ownership_white
var ownership_black
var combined_ownership
var combined_ownership2
var width
var height
var regions
var used_regions
var region_border_black
var region_border_white
var region_resolution
var algorithm_ownership

function state_emoji(s) {
    switch(s) {
    case -1:
        return '⬛'
    case -2:
        return '⬜'
    case 1:
        return '⚫'
    case 2:
        return '⚪'
    case 0:
        return '➕'
    case -3:
        return '🖤'
    case -4:
        return '🤍'
    default:
        return '❓'
    }
}

function region_emoji(r) {
    return String.fromCodePoint(r+0x1f344)
}

function failed() {
    $('#white').text('Failed')
    $('#black').text('Failed')
    $('#combined').text('Failed')
}

function show(states, element) {
    var text = ''

    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            text += state_emoji(states[y][x])
        }
        text += "\n"
    }
    element.text(text)
}

function show_regions(regions, element) {
    text = ''
    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            var r = regions[y][x]
            if(r == 0) {
                text += state_emoji(board[y][x])
            }
            else {
                text += region_emoji(r)
            }
        }
        text += "\n"
    }
    element.text(text)
}

function getBoard_success() {
    width = board[0].length
    height = board.length

    show(board, $('#board'))

    ajax_white = getEstimate('white')
    ajax_black = getEstimate('black')

    $.when(ajax_white, ajax_black).done(function(result_white, result_black) {
        if(result_white[1] != 'success' || result_black[1] != 'success')
        {
            failed()
            return
        }

        ownership_white = result_white[0].ownership
        ownership_black = result_black[0].ownership
        run_algorithm()
    })

}

function run_algorithm() {
    show_ownership(ownership_white, $('#white'))
    show_ownership(ownership_black, $('#black'))

    compute_combined_ownership()
    show(combined_ownership, $('#combined'))

    find_regions()
    show_regions(regions, $('#regions'))

    resolve_regions(combined_ownership)

    unsettle_dead_stones_in_dame()
    show(combined_ownership2, $('#combined2'))

    resolve_regions(combined_ownership2)

    compute_algorithm_ownership()
    show(algorithm_ownership, $('#algorithm'))
}

function unsettle_dead_stones_in_dame() {
    combined_ownership2 = []

    for(var y=0; y<height; y++) {
        combined_ownership2[y] = []
        for(var x=0; x<height; x++) {
            r = regions[y][x]

            if(region_resolution[r] == 0 &&
               (combined_ownership[y][x] == -1 || combined_ownership[y][x] == -2)
              )
            {
                // dame situation; make it unsettled
                combined_ownership2[y][x] = combined_ownership[y][x] - 2
            }
            else
            {
                // dame situation; make it unsettled
                combined_ownership2[y][x] = combined_ownership[y][x]
            }
        }
    }
}

function compute_algorithm_ownership() {
    algorithm_ownership = []

    for(var y=0; y<height; y++) {
        algorithm_ownership[y] = []

        for(var x=0; x<width; x++) {
            if(combined_ownership2[y][x] == -3 || combined_ownership2[y][x] == -4) {
                // need to resolve
                var current = board[y][x] // white or black stone
                var r = regions[y][x]
                var winner = region_resolution[r]
                if(current == winner) {
                    // solidly alive
                    algorithm_ownership[y][x] = current
                }
                else if(winner == 0) {
                    // seki alive?
                    algorithm_ownership[y][x] = current
                }
                else {
                    // call it dead
                    algorithm_ownership[y][x] = -current
                }
            }
            else {
                algorithm_ownership[y][x] = combined_ownership2[y][x]
            }
        }
    }
}

function resolve_regions_increment(ownership, b, x, y, key) {
    if(x < 0 || x >= width) return
    if(y < 0 || y >= height) return

    // don't count the border of unresolved stones
    v = ownership[y][x]
    if(v < -2) return

    r = regions[y][x]
    if(region_border_black[r] === undefined) {
        region_border_black[r] = {}
        region_border_white[r] = {}
    }

    // save the [x,y] coordinates of the border stone as a hash key to
    // avoid double-counting
    if(b == 1)
        region_border_black[r][key] = true
    else
        region_border_white[r][key] = true
}

function resolve_regions(ownership) {
    count = 0
    region_border_black = []
    region_border_white = []

    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            b = ownership[y][x]

            if(b <= 0)
                continue; // not an alive border stone

            resolve_regions_increment(ownership, b, x-1, y, [x,y])
            resolve_regions_increment(ownership, b, x+1, y, [x,y])
            resolve_regions_increment(ownership, b, x, y-1, [x,y])
            resolve_regions_increment(ownership, b, x, y+1, [x,y])
        }
    }

    region_resolution = []
    for(var r = 0; r < region_border_black.length; r++) {
        if(!region_border_black[r])
        {
            // no border was found
            region_resolution[r] = 0
            continue
        }
        black_border_count = Object.keys(region_border_black[r]).length
        white_border_count = Object.keys(region_border_white[r]).length

        if(black_border_count > 0 && white_border_count == 0)
            region_resolution[r] = 1
        else if(black_border_count == 0 && white_border_count > 0)
            region_resolution[r] = 2
        else
            region_resolution[r] = 0
    }
    var x = 1
}

function find_regions() {
    // regions: array with 0 for live stones, and 1, 2, 3,
    // etc. for continguous regions of territory/dame/unsettled
    // points.
    //
    // remap_regions: hash mapping regions to other ones that turned
    // out to be the same.
    regions = []
    var remap_regions = {}
    used_regions = 0

    for(var y=0; y<height; y++) {
        regions[y] = []

        for(var x=0; x<width; x++) {
            var v = combined_ownership[y][x]

            if(v > 0) {
                regions[y][x] = 0
                continue
            }

            var left = 0
            var up = 0
            if(x > 0)
                left = regions[y][x-1]
            if(y > 0)
                up = regions[y-1][x]

            if(!left && !up) {
                // start new region
                used_regions ++
                regions[y][x] = used_regions
                continue
            }

            if(left && up) {
                if(left > up) {
                    remap_regions[left] = up
                    regions[y][x] = up
                }
                else if(up > left) {
                    remap_regions[up] = left
                    regions[y][x] = left
                }
                else
                    regions[y][x] = up
            }
            else if(left)
                regions[y][x] = left
            else // up
                regions[y][x] = up
        }
    }

    // now remap the regions
    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            r = regions[y][x]
            while(remap_regions[r])
                r = remap_regions[r]
            regions[y][x] = r
        }
    }
}

function compute_combined_ownership() {
    combined_ownership = []

    for(var y=0; y<height; y++) {
        combined_ownership[y] = []

        for(var x=0; x<width; x++) {
            var state = board[y][x]
            var owner1 = get_owner(ownership_white, x, y)
            var owner2 = get_owner(ownership_black, x, y)

            var owner = 0
            if(owner1 == owner2)
                owner = owner1

            var result = 0 // unknown
            if(state == owner) // live
                result = state
            else if(state == 1 && owner == 2) // dead black
                result = -1
            else if(state == 2 && owner == 1) // dead white
                result = -2
            else if(owner == 0 && state == 1) // unresolved black
                result = -3
            else if(owner == 0 && state == 2) // unresolved white
                result = -4

            combined_ownership[y][x] = result
        }
    }
}

function get_owner(ownership, x, y) {
    if(ownership[y][x] > 0)
        return 1
    else
        return 2
}

function show_ownership(ownership, element) {
    var text = ''

    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            var owner = get_owner(ownership, x, y)
            text += state_emoji(owner)
        }
        text += "\n"
    }

    element.text(text)
}

function getBoard() {
    var urlParams = new URLSearchParams(window.location.search)
    var game = urlParams.get('game')
    var board_string = urlParams.get('board')

    if(game) {
        $('[name=game]').val(game)
        $.ajax('https://api.allorigins.win/get?url=https://online-go.com/termination-api/game/'+game+'/state',
           {
               success: function(data, textStatus, jqXGR) {
                   board = $.parseJSON(data.contents).board
                   $('[name=board]').val(JSON.stringify(board))
                   getBoard_success()
               },
               error: failed
           }
              )
    }
    else {
        $('[name=board]').val(board_string)
        board = $.parseJSON(board_string)
        getBoard_success()
    }
}

function getEstimate(player_to_move) {
    var data = {
        player_to_move: player_to_move,
        width: board[0].length,
        height: board.length,
        rules: 'aga',
        board_state: board
    }

    return $.ajax('https://beta-ai.online-go.com/api/score',
           {
               type: 'post',
               data: JSON.stringify(data),
               contentType: 'application/json; charset=utf-8',
           }
          )
}

$(getBoard)
